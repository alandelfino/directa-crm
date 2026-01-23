import { checkboxesFeature, hotkeysCoreFeature, selectionFeature, syncDataLoaderFeature } from "@headless-tree/core"
import { useTree } from "@headless-tree/react"
import { FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import { useMemo } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Tree, TreeItem, TreeItemLabel } from "@/components/tree"

interface ApiCategory {
  id: string | number
  name: string
  parent_id?: string | number | null
  parentId?: string | number | null
  children?: ApiCategory[]
}

interface Item {
  name: string
  children?: string[]
}

const indent = 20
const ROOT_ID = "__root__"

function buildItemsFromFlat(categories: ApiCategory[]): { items: Record<string, Item>; rootChildren: string[] } {
  const items: Record<string, Item> = {}
  const rootChildren: string[] = []

  for (const cat of categories) {
    const id = String(cat.id)
    if (!items[id]) {
      items[id] = { name: cat.name, children: [] }
    } else {
      items[id].name = cat.name
      items[id].children = items[id].children ?? []
    }
  }

  for (const cat of categories) {
    const id = String(cat.id)
    const parentRaw = cat.parent_id as unknown as string | number | null | undefined
    const parentId = parentRaw == null || parentRaw === 0 || parentRaw === "0" ? null : String(parentRaw)

    if (parentId) {
      if (!items[parentId]) {
        items[parentId] = { name: "Categoria", children: [] }
      }
      items[parentId].children = items[parentId].children || []
      if (!items[parentId].children!.includes(id)) {
        items[parentId].children!.push(id)
      }
    } else {
      rootChildren.push(id)
    }
  }

  return { items, rootChildren }
}

function buildItemsFromNested(categories: ApiCategory[]): { items: Record<string, Item>; rootChildren: string[] } {
  const items: Record<string, Item> = {}
  const rootChildren: string[] = []

  const visit = (cat: ApiCategory, isRootChild: boolean) => {
    const id = String(cat.id)
    items[id] = { name: cat.name, children: [] }
    if (isRootChild) rootChildren.push(id)
    if (Array.isArray(cat.children)) {
      for (const child of cat.children) {
        const childId = String(child.id)
        items[id].children!.push(childId)
        visit(child, false)
      }
    }
  }

  for (const cat of categories) {
    visit(cat, true)
  }

  return { items, rootChildren }
}

export default function TreeTable({ data }: { data: unknown }) {
  // Aceita múltiplos formatos de resposta e normaliza para um array de categorias
  const categories: ApiCategory[] = useMemo(() => {
    const d: any = data
    if (!d) return []
    if (Array.isArray(d)) return d as ApiCategory[]
    if (Array.isArray(d.items)) return d.items as ApiCategory[]
    if (Array.isArray(d.categories)) return d.categories as ApiCategory[]
    if (Array.isArray(d.data)) return d.data as ApiCategory[]
    return []
  }, [data])

  const { items, rootChildren } = useMemo(() => {
    if (!categories || categories.length === 0) {
      return { items: {} as Record<string, Item>, rootChildren: [] as string[] }
    }
    const hasNested = categories.some((c) => Array.isArray(c.children) && c.children!.length > 0)
    return hasNested ? buildItemsFromNested(categories) : buildItemsFromFlat(categories)
  }, [categories])

  const tree = useTree<Item>({
    initialState: { expandedItems: [ROOT_ID] },
    indent,
    rootItemId: ROOT_ID,
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    dataLoader: {
      getItem: (itemId) => {
        if (itemId === ROOT_ID) return { name: "Categorias", children: rootChildren }
        return items[itemId]
      },
      getChildren: (itemId) => {
        if (itemId === ROOT_ID) return rootChildren
        return items[itemId]?.children ?? []
      },
    },
    canCheckFolders: true,
    features: [syncDataLoaderFeature, selectionFeature, checkboxesFeature, hotkeysCoreFeature],
  })

  const showEmpty = Object.keys(items).length === 0

  return (
    <div className="flex h-full flex-col gap-2 *:first:grow">
      <div className="p-4">
        {showEmpty ? (
          <div className="text-sm text-muted-foreground">Nenhuma categoria encontrada.</div>
        ) : (
          <Tree
            className="relative before:absolute before:inset-0 before:ms-4.5 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
            indent={indent}
            tree={tree}
          >
            {tree.getItems().map((item) => {
              return (
                <div key={item.getId()} className="flex items-center gap-1.5 not-last:pb-0.5">
                  {item.getId() !== ROOT_ID && (
                    <Checkbox
                      checked={{ checked: true, unchecked: false, indeterminate: "indeterminate" as const }[item.getCheckedState()]}
                      onCheckedChange={(checked) => {
                        const checkboxProps = item.getCheckboxProps()
                        checkboxProps.onChange?.({ target: { checked } })
                      }}
                    />
                  )}
                  <TreeItem item={item} className="flex-1 not-last:pb-0">
                    <TreeItemLabel className="relative before:absolute before:inset-x-0 before:-inset-y-0.5 before:-z-10 before:bg-background">
                      <span className="flex items-center gap-2">
                        {item.isFolder() ? (
                          item.isExpanded() ? (
                            <FolderOpenIcon className="pointer-events-none size-4 text-muted-foreground" />
                          ) : (
                            <FolderIcon className="pointer-events-none size-4 text-muted-foreground" />
                          )
                        ) : (
                          <FileIcon className="pointer-events-none size-4 text-muted-foreground" />
                        )}
                        {item.getItemName()}
                      </span>
                    </TreeItemLabel>
                  </TreeItem>
                </div>
              )
            })}
          </Tree>
        )}
      </div>
    </div>
  )
}
