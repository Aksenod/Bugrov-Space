import{r as s,j as e}from"./iframe-D0Nje-x_.js";import{r as V}from"./index-CW00jbUy.js";import{c as _}from"./createLucideIcon-Cg4GjVm3.js";import{C as W}from"./circle-alert-Dy2I1q0z.js";import{X as D}from"./x-BDm1Lc4K.js";import{B as u}from"./Button-BWGzIklL.js";import"./preload-helper-PPVm8Dsz.js";import"./index-BmH3fkGo.js";import"./loader-circle-DySi1wl5.js";const I=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],M=_("circle-check",I);const O=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],E=_("circle-x",O);const q=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],$=_("info",q),j=({isOpen:a,onClose:t,title:i,message:n,variant:d="info",duration:r=0})=>{const[m,C]=s.useState(!1),[B,k]=s.useState(!1),c=s.useRef(null),p=s.useRef(!0),T=s.useCallback(()=>{c.current&&clearTimeout(c.current),V.flushSync(()=>{C(!0)}),requestAnimationFrame(()=>{c.current=setTimeout(()=>{p.current&&(t(),C(!1),k(!1)),c.current=null},300)})},[t]);if(s.useEffect(()=>{if(p.current=!0,a){C(!1);const A=setTimeout(()=>{p.current&&k(!0)},10);let S;return r>0&&(S=setTimeout(()=>{T()},r)),()=>{clearTimeout(A),S&&clearTimeout(S)}}else m||k(!1)},[a,r,T,m]),s.useEffect(()=>()=>{p.current=!1,c.current&&clearTimeout(c.current)},[]),!a&&!m)return null;const l={success:{icon:M,iconBg:"bg-emerald-500/20",iconColor:"text-emerald-400",iconBorder:"border-emerald-500/30",gradient:"from-emerald-500/50 via-emerald-400/30 to-transparent",glow:"shadow-[0_0_30px_rgba(16,185,129,0.2)]"},error:{icon:E,iconBg:"bg-red-500/20",iconColor:"text-red-400",iconBorder:"border-red-500/30",gradient:"from-red-500/50 via-red-400/30 to-transparent",glow:"shadow-[0_0_30px_rgba(239,68,68,0.2)]"},warning:{icon:W,iconBg:"bg-amber-500/20",iconColor:"text-amber-400",iconBorder:"border-amber-500/30",gradient:"from-amber-500/50 via-amber-400/30 to-transparent",glow:"shadow-[0_0_30px_rgba(245,158,11,0.2)]"},info:{icon:$,iconBg:"bg-blue-500/20",iconColor:"text-blue-400",iconBorder:"border-blue-500/30",gradient:"from-blue-500/50 via-blue-400/30 to-transparent",glow:"shadow-[0_0_30px_rgba(59,130,246,0.2)]"}}[d],N=l.icon;return e.jsx("div",{className:"fixed inset-0 z-[130] flex items-start justify-center p-4 pt-6 pointer-events-none",children:e.jsxs("div",{className:`relative w-full max-w-md bg-gradient-to-br from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] ${l.glow} shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300 ease-out ${m?"opacity-0 -translate-y-4 scale-95":B?"opacity-100 translate-y-0 scale-100":"opacity-0 translate-y-4 scale-95"}`,children:[e.jsx("div",{className:`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${l.gradient}`}),e.jsx("div",{className:"p-5",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:`p-2.5 ${l.iconBg} ${l.iconBorder} border rounded-xl flex-shrink-0`,children:e.jsx(N,{size:20,className:l.iconColor})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[i&&e.jsx("h3",{className:"text-base font-bold text-white mb-1.5",children:i}),e.jsx("p",{className:"text-sm text-white/80 leading-relaxed whitespace-pre-line",children:n})]}),e.jsx("button",{onClick:T,className:"p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0",children:e.jsx(D,{size:16})})]})})]})})};j.__docgenInfo={description:"",methods:[],displayName:"AlertDialog",props:{isOpen:{required:!0,tsType:{name:"boolean"},description:""},onClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},title:{required:!1,tsType:{name:"string"},description:""},message:{required:!0,tsType:{name:"string"},description:""},variant:{required:!1,tsType:{name:"union",raw:"'success' | 'error' | 'info' | 'warning'",elements:[{name:"literal",value:"'success'"},{name:"literal",value:"'error'"},{name:"literal",value:"'info'"},{name:"literal",value:"'warning'"}]},description:"",defaultValue:{value:"'info'",computed:!1}},duration:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"0",computed:!1}}}};const P={title:"UI/AlertDialog",component:j,tags:["autodocs"],parameters:{layout:"fullscreen",backgrounds:{default:"dark",values:[{name:"dark",value:"#000000"}]}}},o=({variant:a,title:t,message:i,duration:n=0})=>{const[d,r]=s.useState(!1);return e.jsxs("div",{className:"p-8",children:[e.jsxs(u,{onClick:()=>r(!0),children:["Открыть ",a]}),e.jsx(j,{isOpen:d,onClose:()=>r(!1),variant:a,title:t,message:i,duration:n})]})},g={render:()=>e.jsx(o,{variant:"success",title:"Успешно!",message:"Операция выполнена успешно."})},f={render:()=>e.jsx(o,{variant:"error",title:"Ошибка",message:"Произошла ошибка при выполнении операции."})},x={render:()=>e.jsx(o,{variant:"warning",title:"Внимание",message:"Пожалуйста, проверьте введенные данные."})},v={render:()=>e.jsx(o,{variant:"info",title:"Информация",message:"Это информационное сообщение для пользователя."})},h={render:()=>e.jsx(o,{variant:"info",message:"Сообщение без заголовка."})},b={render:()=>e.jsx(o,{variant:"success",title:"Автозакрытие",message:"Это сообщение закроется через 3 секунды.",duration:3e3})},y={render:()=>e.jsx(o,{variant:"info",title:"Длинное сообщение",message:"Это очень длинное сообщение, которое демонстрирует, как компонент обрабатывает многострочный текст. Компонент должен корректно отображать весь текст, даже если он занимает несколько строк."})},w={render:()=>{const[a,t]=s.useState(null),[i,n]=s.useState(""),[d,r]=s.useState("");return e.jsxs("div",{className:"p-8 space-y-4",children:[e.jsxs("div",{className:"flex flex-wrap gap-3",children:[e.jsx(u,{onClick:()=>{t("success"),r("Успешно!"),n("Операция выполнена успешно.")},children:"Success"}),e.jsx(u,{onClick:()=>{t("error"),r("Ошибка"),n("Произошла ошибка.")},variant:"secondary",children:"Error"}),e.jsx(u,{onClick:()=>{t("warning"),r("Внимание"),n("Проверьте данные.")},variant:"tertiary",children:"Warning"}),e.jsx(u,{onClick:()=>{t("info"),r("Информация"),n("Информационное сообщение.")},variant:"ghost",children:"Info"})]}),a&&e.jsx(j,{isOpen:!0,onClose:()=>t(null),variant:a,title:d,message:i})]})}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <AlertDialogWrapper variant="success" title="Успешно!" message="Операция выполнена успешно." />
}`,...g.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <AlertDialogWrapper variant="error" title="Ошибка" message="Произошла ошибка при выполнении операции." />
}`,...f.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <AlertDialogWrapper variant="warning" title="Внимание" message="Пожалуйста, проверьте введенные данные." />
}`,...x.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <AlertDialogWrapper variant="info" title="Информация" message="Это информационное сообщение для пользователя." />
}`,...v.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <AlertDialogWrapper variant="info" message="Сообщение без заголовка." />
}`,...h.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <AlertDialogWrapper variant="success" title="Автозакрытие" message="Это сообщение закроется через 3 секунды." duration={3000} />
}`,...b.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <AlertDialogWrapper variant="info" title="Длинное сообщение" message="Это очень длинное сообщение, которое демонстрирует, как компонент обрабатывает многострочный текст. Компонент должен корректно отображать весь текст, даже если он занимает несколько строк." />
}`,...y.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [openVariant, setOpenVariant] = useState<'success' | 'error' | 'info' | 'warning' | null>(null);
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('');
    return <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => {
          setOpenVariant('success');
          setTitle('Успешно!');
          setMessage('Операция выполнена успешно.');
        }}>
            Success
          </Button>
          <Button onClick={() => {
          setOpenVariant('error');
          setTitle('Ошибка');
          setMessage('Произошла ошибка.');
        }} variant="secondary">
            Error
          </Button>
          <Button onClick={() => {
          setOpenVariant('warning');
          setTitle('Внимание');
          setMessage('Проверьте данные.');
        }} variant="tertiary">
            Warning
          </Button>
          <Button onClick={() => {
          setOpenVariant('info');
          setTitle('Информация');
          setMessage('Информационное сообщение.');
        }} variant="ghost">
            Info
          </Button>
        </div>
        {openVariant && <AlertDialog isOpen={true} onClose={() => setOpenVariant(null)} variant={openVariant} title={title} message={message} />}
      </div>;
  }
}`,...w.parameters?.docs?.source}}};const Q=["Success","Error","Warning","Info","WithoutTitle","AutoClose","LongMessage","AllVariants"];export{w as AllVariants,b as AutoClose,f as Error,v as Info,y as LongMessage,g as Success,x as Warning,h as WithoutTitle,Q as __namedExportsOrder,P as default};
