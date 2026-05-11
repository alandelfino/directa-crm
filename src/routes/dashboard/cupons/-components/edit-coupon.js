"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditCouponSheet = void 0;
var react_1 = require("react");
var zod_1 = require("zod");
var react_hook_form_1 = require("react-hook-form");
var zod_2 = require("@hookform/resolvers/zod");
var react_query_1 = require("@tanstack/react-query");
var sonner_1 = require("sonner");
var lucide_react_1 = require("lucide-react");
var react_number_format_1 = require("react-number-format");
var auth_1 = require("@/lib/auth");
var button_1 = require("@/components/ui/button");
var form_1 = require("@/components/ui/form");
var input_1 = require("@/components/ui/input");
var select_1 = require("@/components/ui/select");
var sheet_1 = require("@/components/ui/sheet");
var skeleton_1 = require("@/components/ui/skeleton");
var couponTypeValues = [
    'fixed_in_total_value',
    'percent_in_total_value',
    'fixed_in_product_value',
    'percent_in_product_value',
    'fixed_in_shipping_value',
    'percent_in_shipping_value',
];
var couponTypes = [
    { value: 'fixed_in_total_value', label: 'Fixo no total do pedido' },
    { value: 'percent_in_total_value', label: 'Percentual no total do pedido' },
    { value: 'fixed_in_product_value', label: 'Fixo no valor dos produtos' },
    { value: 'percent_in_product_value', label: 'Percentual no valor dos produtos' },
    { value: 'fixed_in_shipping_value', label: 'Fixo no valor do frete' },
    { value: 'percent_in_shipping_value', label: 'Percentual no valor do frete' },
];
var valueSchema = zod_1.z
    .number({ required_error: 'Valor é obrigatório', invalid_type_error: 'Valor é obrigatório' })
    .refine(function (v) { return Number.isFinite(v); }, { message: 'Valor é obrigatório' })
    .int({ message: 'Valor deve ser um número inteiro' })
    .min(0, { message: 'Valor mínimo é 0' });
var optionalNonEmptyString = function (message) {
    return zod_1.z
        .union([zod_1.z.undefined(), zod_1.z.literal(''), zod_1.z.string().min(1, { message: message })])
        .transform(function (v) { return (v === '' || v === undefined ? undefined : v); });
};
var optionalDateTimeLocalString = zod_1.z
    .union([zod_1.z.undefined(), zod_1.z.literal(''), zod_1.z.string().min(1, { message: 'Data inválida' })])
    .transform(function (v) { return (v === '' || v === undefined ? undefined : v); })
    .refine(function (v) { return !v || !Number.isNaN(new Date(v).getTime()); }, { message: 'Data inválida' });
var formSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, { message: 'Código é obrigatório' }),
    customerMessage: optionalNonEmptyString('Mensagem deve ter pelo menos 1 caractere').optional(),
    description: zod_1.z.string().min(1, { message: 'Descrição é obrigatória' }),
    type: zod_1.z.enum(couponTypeValues),
    value: valueSchema,
    storeId: zod_1.z.coerce.number().int().min(1, { message: 'Loja é obrigatória' }),
    validFrom: optionalDateTimeLocalString.optional(),
    validTo: optionalDateTimeLocalString.optional(),
}).superRefine(function (data, ctx) {
    if (String(data.type).startsWith('percent_')) {
        if (typeof data.value === 'number' && Number.isFinite(data.value) && data.value > 10000) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['value'],
                message: 'Percentual máximo é 100,00%',
            });
        }
    }
});
var COUPON_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
var isRecord = function (v) { return typeof v === 'object' && v !== null; };
var getApiErrorData = function (err) {
    if (!isRecord(err))
        return null;
    var response = err.response;
    if (!isRecord(response))
        return null;
    var data = response.data;
    if (!isRecord(data))
        return null;
    var title = typeof data.title === 'string' ? data.title : undefined;
    var detail = typeof data.detail === 'string' ? data.detail : undefined;
    return title || detail ? { title: title, detail: detail } : null;
};
function toDateTimeLocalInputValue(v) {
    if (!v)
        return '';
    var d = new Date(v);
    if (Number.isNaN(d.getTime()))
        return '';
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var yyyy = d.getFullYear();
    var MM = pad(d.getMonth() + 1);
    var dd = pad(d.getDate());
    var HH = pad(d.getHours());
    var mm = pad(d.getMinutes());
    return "".concat(yyyy, "-").concat(MM, "-").concat(dd, "T").concat(HH, ":").concat(mm);
}
function generateCouponCode() {
    var pick = function () { return COUPON_CODE_CHARS[Math.floor(Math.random() * COUPON_CODE_CHARS.length)]; };
    var a = pick();
    var b = pick();
    var c = pick();
    var d = pick();
    var e = pick();
    var f = pick();
    return "".concat(a).concat(b).concat(c, "-").concat(d).concat(e).concat(f);
}
var CouponCodeInput = (0, react_1.forwardRef)(function (_a, ref) {
    var value = _a.value, onChange = _a.onChange, onGenerate = _a.onGenerate, generating = _a.generating, disabled = _a.disabled, props = __rest(_a, ["value", "onChange", "onGenerate", "generating", "disabled"]);
    return (<div className="flex gap-2">
      <input_1.Input ref={ref} value={value} onChange={function (e) { return onChange(e.target.value); }} disabled={disabled} {...props}/>
      <button_1.Button type="button" variant="outline" size="icon" onClick={onGenerate} disabled={disabled || generating} title="Gerar código">
        <lucide_react_1.RefreshCw className={generating ? 'size-[0.85rem] animate-spin' : 'size-[0.85rem]'}/>
      </button_1.Button>
    </div>);
});
CouponCodeInput.displayName = 'CouponCodeInput';
function EditCouponSheet(_a) {
    var _this = this;
    var couponId = _a.couponId, props = __rest(_a, ["couponId"]);
    var _b = (0, react_1.useState)(false), open = _b[0], setOpen = _b[1];
    var _c = (0, react_1.useState)(false), loading = _c[0], setLoading = _c[1];
    var queryClient = (0, react_query_1.useQueryClient)();
    var usedCodesRef = (0, react_1.useRef)(new Set());
    var form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_2.zodResolver)(formSchema),
        defaultValues: {
            code: '',
            customerMessage: '',
            description: '',
            type: 'fixed_in_total_value',
            value: undefined,
            storeId: 0,
            validFrom: '',
            validTo: '',
        },
    });
    var type = (0, react_hook_form_1.useWatch)({ control: form.control, name: 'type' });
    var isPercentType = function (t) { return String(t !== null && t !== void 0 ? t : '').startsWith('percent_'); };
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['stores-list-select'],
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var response, items;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, auth_1.privateInstance.get('/tenant/stores', {
                            params: { page: 1, limit: 100, sortBy: 'name', orderBy: 'asc' },
                        })];
                    case 1:
                        response = _c.sent();
                        items = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.items) !== null && _b !== void 0 ? _b : response.data;
                        return [2 /*return*/, Array.isArray(items) ? items : []];
                }
            });
        }); },
        enabled: open,
    }), stores = _d.data, isLoadingStores = _d.isLoading;
    var fetchCoupon = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var response, c, normalizedType, normalizedValueRaw, normalizedValue, error_1, errorData;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!couponId)
                        return [2 /*return*/];
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, 4, 5]);
                    setLoading(true);
                    return [4 /*yield*/, auth_1.privateInstance.get("/tenant/cupons/".concat(couponId))];
                case 2:
                    response = _f.sent();
                    if (response.status !== 200)
                        throw new Error('Erro ao carregar cupom');
                    c = response.data;
                    normalizedType = couponTypeValues.includes(String(c.type))
                        ? String(c.type)
                        : 'fixed_in_total_value';
                    normalizedValueRaw = Number((_a = c.value) !== null && _a !== void 0 ? _a : 0);
                    normalizedValue = String(normalizedType).startsWith('percent_') ? Math.min(normalizedValueRaw, 10000) : normalizedValueRaw;
                    form.reset({
                        code: (_b = c.code) !== null && _b !== void 0 ? _b : '',
                        customerMessage: (_c = c.customerMessage) !== null && _c !== void 0 ? _c : '',
                        description: (_d = c.description) !== null && _d !== void 0 ? _d : '',
                        type: normalizedType,
                        value: normalizedValue,
                        storeId: Number((_e = c.storeId) !== null && _e !== void 0 ? _e : 0),
                        validFrom: toDateTimeLocalInputValue(c.validFrom),
                        validTo: toDateTimeLocalInputValue(c.validTo),
                    });
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _f.sent();
                    errorData = getApiErrorData(error_1);
                    sonner_1.toast.error((errorData === null || errorData === void 0 ? void 0 : errorData.title) || 'Erro ao carregar cupom', {
                        description: (errorData === null || errorData === void 0 ? void 0 : errorData.detail) || 'Não foi possível carregar os dados do cupom.',
                    });
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [couponId, form]);
    (0, react_1.useEffect)(function () {
        if (open)
            fetchCoupon();
    }, [open, fetchCoupon]);
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var raw = form.getValues('value');
        var current = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
        if (isPercentType(type)) {
            form.setValue('value', Math.min(current, 10000), { shouldDirty: true, shouldValidate: true });
        }
    }, [open, type, form]);
    var closeSheet = function () {
        setOpen(false);
        form.reset();
    };
    var _e = (0, react_query_1.useMutation)({
        mutationFn: function (values) { return __awaiter(_this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                payload = __assign(__assign({}, values), { validFrom: values.validFrom ? new Date(values.validFrom).toISOString() : undefined, validTo: values.validTo ? new Date(values.validTo).toISOString() : undefined });
                return [2 /*return*/, auth_1.privateInstance.put("/tenant/cupons/".concat(couponId), payload)];
            });
        }); },
        onSuccess: function (response) {
            if (response.status === 200) {
                sonner_1.toast.success('Cupom atualizado com sucesso!');
                closeSheet();
                queryClient.invalidateQueries({ queryKey: ['cupons'] });
            }
            else {
                var errorData = getApiErrorData({ response: response });
                sonner_1.toast.error((errorData === null || errorData === void 0 ? void 0 : errorData.title) || 'Erro ao salvar cupom', { description: (errorData === null || errorData === void 0 ? void 0 : errorData.detail) || 'Não foi possível atualizar o cupom.' });
            }
        },
        onError: function (error) {
            var errorData = getApiErrorData(error);
            sonner_1.toast.error((errorData === null || errorData === void 0 ? void 0 : errorData.title) || 'Erro ao salvar cupom', {
                description: (errorData === null || errorData === void 0 ? void 0 : errorData.detail) || 'Não foi possível atualizar o cupom.',
            });
        },
    }), isPending = _e.isPending, mutate = _e.mutate;
    function onSubmit(values) {
        mutate(values);
    }
    return (<sheet_1.Sheet open={open} onOpenChange={setOpen}>
      <sheet_1.SheetTrigger asChild>
        <button_1.Button variant="outline" size="sm">
          <lucide_react_1.Edit className="size-[0.85rem]"/> Editar
        </button_1.Button>
      </sheet_1.SheetTrigger>
      <sheet_1.SheetContent className="flex flex-col overflow-hidden">
        <form_1.Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <sheet_1.SheetHeader>
              <sheet_1.SheetTitle>Editar cupom</sheet_1.SheetTitle>
              <sheet_1.SheetDescription>
                {loading ? (<span className="flex items-center gap-2">
                    <lucide_react_1.Loader className="size-[0.85rem] animate-spin"/>
                    Carregando dados do cupom...
                  </span>) : (<>Atualize os campos abaixo e salve as alterações.</>)}
              </sheet_1.SheetDescription>
            </sheet_1.SheetHeader>

            <div className="flex-1 overflow-y-auto grid auto-rows-min gap-6 px-4 py-4">
              <form_1.FormField control={form.control} name="code" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                    <form_1.FormLabel>Código</form_1.FormLabel>
                    <form_1.FormControl>
                      <CouponCodeInput placeholder="Ex.: ABC-123" value={field.value} onChange={field.onChange} disabled={loading || isPending} onGenerate={function () {
                    var _a;
                    var current = String((_a = form.getValues('code')) !== null && _a !== void 0 ? _a : '').trim();
                    for (var i = 0; i < 25; i++) {
                        var next = generateCouponCode();
                        if (next !== current && !usedCodesRef.current.has(next)) {
                            usedCodesRef.current.add(next);
                            form.setValue('code', next, { shouldDirty: true, shouldValidate: true });
                            return;
                        }
                    }
                    var fallback = generateCouponCode();
                    usedCodesRef.current.add(fallback);
                    form.setValue('code', fallback, { shouldDirty: true, shouldValidate: true });
                }}/>
                    </form_1.FormControl>
                    <form_1.FormMessage />
                  </form_1.FormItem>);
        }}/>

              <form_1.FormField control={form.control} name="customerMessage" render={function (_a) {
            var _b;
            var field = _a.field;
            return (<form_1.FormItem>
                    <form_1.FormLabel>Mensagem para o cliente</form_1.FormLabel>
                    <form_1.FormControl>
                      <input_1.Input placeholder="Ex.: Obrigado por comprar com a gente!" {...field} value={(_b = field.value) !== null && _b !== void 0 ? _b : ''} disabled={loading || isPending}/>
                    </form_1.FormControl>
                    <form_1.FormMessage />
                  </form_1.FormItem>);
        }}/>

              <form_1.FormField control={form.control} name="description" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                    <form_1.FormLabel>Descrição</form_1.FormLabel>
                    <form_1.FormControl>
                      <input_1.Input placeholder="Descreva como o cupom funciona..." {...field} disabled={loading || isPending}/>
                    </form_1.FormControl>
                    <form_1.FormMessage />
                  </form_1.FormItem>);
        }}/>

              <form_1.FormField control={form.control} name="type" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                    <form_1.FormLabel>Tipo</form_1.FormLabel>
                    <select_1.Select onValueChange={field.onChange} value={field.value} disabled={loading || isPending}>
                      <form_1.FormControl>
                        <select_1.SelectTrigger className="w-full">
                          <select_1.SelectValue placeholder="Selecione..."/>
                        </select_1.SelectTrigger>
                      </form_1.FormControl>
                      <select_1.SelectContent>
                        {couponTypes.map(function (t) { return (<select_1.SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </select_1.SelectItem>); })}
                      </select_1.SelectContent>
                    </select_1.Select>
                    <form_1.FormMessage />
                  </form_1.FormItem>);
        }}/>

              <form_1.FormField control={form.control} name="value" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                    <form_1.FormLabel>Valor</form_1.FormLabel>
                    <form_1.FormControl>
                      {isPercentType(type) ? (<react_number_format_1.NumericFormat customInput={input_1.Input} value={typeof field.value === 'number' ? field.value / 100 : undefined} onValueChange={function (v) {
                        if (v.floatValue === undefined) {
                            field.onChange(undefined);
                            return;
                        }
                        var next = Math.min(Math.round(v.floatValue * 100), 10000);
                        field.onChange(next);
                    }} isAllowed={function (v) { return v.floatValue === undefined || v.floatValue <= 100; }} decimalScale={2} fixedDecimalScale decimalSeparator="," thousandSeparator="." allowNegative={false} suffix="%" placeholder="0,00%" inputMode="numeric" disabled={loading || isPending}/>) : (<react_number_format_1.NumericFormat customInput={input_1.Input} value={typeof field.value === 'number' ? field.value / 100 : undefined} onValueChange={function (v) {
                        if (v.floatValue === undefined) {
                            field.onChange(undefined);
                            return;
                        }
                        field.onChange(Math.round(v.floatValue * 100));
                    }} decimalScale={2} fixedDecimalScale decimalSeparator="," thousandSeparator="." allowNegative={false} prefix="R$ " placeholder="R$ 0,00" inputMode="numeric" disabled={loading || isPending}/>)}
                    </form_1.FormControl>
                    <form_1.FormMessage />
                  </form_1.FormItem>);
        }}/>

              <form_1.FormField control={form.control} name="storeId" render={function (_a) {
            var field = _a.field;
            return (<form_1.FormItem>
                    <form_1.FormLabel>Loja</form_1.FormLabel>
                    {isLoadingStores ? (<skeleton_1.Skeleton className="h-10 w-full"/>) : (<select_1.Select onValueChange={function (val) { return field.onChange(Number(val)); }} value={field.value ? String(field.value) : undefined} disabled={loading || isPending}>
                        <form_1.FormControl>
                          <select_1.SelectTrigger className="w-full">
                            <select_1.SelectValue placeholder="Selecione..."/>
                          </select_1.SelectTrigger>
                        </form_1.FormControl>
                        <select_1.SelectContent>
                          {(stores !== null && stores !== void 0 ? stores : []).map(function (store) { return (<select_1.SelectItem key={store.id} value={String(store.id)}>
                              {store.name}
                            </select_1.SelectItem>); })}
                        </select_1.SelectContent>
                      </select_1.Select>)}
                    <form_1.FormMessage />
                  </form_1.FormItem>);
        }}/>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <form_1.FormField control={form.control} name="validFrom" render={function (_a) {
            var _b;
            var field = _a.field;
            return (<form_1.FormItem>
                      <form_1.FormLabel>Válido a partir de</form_1.FormLabel>
                      <form_1.FormControl>
                        <input_1.Input type="datetime-local" value={(_b = field.value) !== null && _b !== void 0 ? _b : ''} onChange={function (e) { return field.onChange(e.target.value); }} disabled={loading || isPending}/>
                      </form_1.FormControl>
                      <form_1.FormMessage />
                    </form_1.FormItem>);
        }}/>

                <form_1.FormField control={form.control} name="validTo" render={function (_a) {
            var _b;
            var field = _a.field;
            return (<form_1.FormItem>
                      <form_1.FormLabel>Válido até</form_1.FormLabel>
                      <form_1.FormControl>
                        <input_1.Input type="datetime-local" value={(_b = field.value) !== null && _b !== void 0 ? _b : ''} onChange={function (e) { return field.onChange(e.target.value); }} disabled={loading || isPending}/>
                      </form_1.FormControl>
                      <form_1.FormMessage />
                    </form_1.FormItem>);
        }}/>
              </div>
            </div>

            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <sheet_1.SheetClose asChild>
                  <button_1.Button variant="outline" size="sm" className="w-full">
                    Cancelar
                  </button_1.Button>
                </sheet_1.SheetClose>
                <button_1.Button type="submit" size="sm" disabled={isPending || loading} className="w-full">
                  {isPending ? <lucide_react_1.Loader className="animate-spin size-[0.85rem]"/> : 'Salvar'}
                </button_1.Button>
              </div>
            </div>
          </form>
        </form_1.Form>
      </sheet_1.SheetContent>
    </sheet_1.Sheet>);
}
exports.EditCouponSheet = EditCouponSheet;
