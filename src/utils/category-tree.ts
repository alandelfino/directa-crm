
export type ApiCategory = {
  id: number | string
  name: string
  parent_id?: number | string | null
  parentId?: number | string | null
  children?: ApiCategory[]
  [key: string]: any
}

export type TreeStructure = {
  items: Record<string, { name: string; children?: string[] }>
  rootChildren: string[]
}

export function buildCategoryTree(categories: ApiCategory[] | any): TreeStructure {
  const items: Record<string, { name: string; children?: string[] }> = {}
  const rootChildren: string[] = []

  // Normalização da entrada
  let data: ApiCategory[] = []
  if (Array.isArray(categories)) data = categories
  else if (categories && Array.isArray(categories.items)) data = categories.items
  else if (categories && Array.isArray(categories.data)) data = categories.data
  else if (categories && Array.isArray(categories.categories)) data = categories.categories
  
  if (!data || data.length === 0) return { items, rootChildren }

  // Verifica se já está aninhado
  const hasNested = data.some((c) => Array.isArray(c.children) && c.children.length > 0)

  if (hasNested) {
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
    
    for (const cat of data) visit(cat, true)
  } else {
    // Construção a partir de lista plana (flat list)
    const childrenMap = new Map<string, string[]>()
    const byId = new Map<string, ApiCategory>()
    
    const getId = (c: ApiCategory) => String(c.id)
    
    const getParent = (c: ApiCategory) => {
      // Tenta parent_id, parentId, ou outras variações comuns
      const raw = c.parent_id ?? c.parentId ?? c.parent?.id
      if (raw === undefined || raw === null || raw === 0 || raw === '0') return null
      return String(raw)
    }

    // Primeira passada: indexar e inicializar mapas
    for (const c of data) {
      const id = getId(c)
      byId.set(id, c)
      if (!childrenMap.has(id)) {
        childrenMap.set(id, [])
      }
    }

    // Segunda passada: popular relacionamentos
    for (const c of data) {
      const id = getId(c)
      const parentId = getParent(c)
      
      // Se tem pai e o pai existe na lista carregada -> é filho
      if (parentId && childrenMap.has(parentId)) {
        childrenMap.get(parentId)!.push(id)
      } else {
        // Se não tem pai, ou pai não está na lista -> é raiz (top-level)
        rootChildren.push(id)
      }
    }

    // Terceira passada: construir objeto final
    for (const [id, cat] of byId.entries()) {
      items[id] = { 
        name: cat.name, 
        children: childrenMap.get(id) 
      }
    }
  }

  return { items, rootChildren }
}
