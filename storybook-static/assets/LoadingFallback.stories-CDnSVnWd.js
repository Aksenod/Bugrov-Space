import{j as e}from"./iframe-BafptweW.js";import{B as p}from"./bot-ZL7mrB9a.js";import{L as u}from"./loader-circle-DLC5VMCK.js";import"./preload-helper-PPVm8Dsz.js";import"./createLucideIcon-DJgVC9iu.js";const t=()=>e.jsx("div",{className:"fixed inset-0 z-50 bg-gradient-to-br from-black via-black to-indigo-950/20 flex items-center justify-center",children:e.jsxs("div",{className:"text-center space-y-4",children:[e.jsxs("div",{className:"relative",children:[e.jsx("div",{className:"absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"}),e.jsx(p,{size:64,className:"relative mx-auto animate-bounce"})]}),e.jsx("p",{className:"text-white/60",children:"Загрузка..."})]})}),i=()=>e.jsx("div",{className:"flex items-center justify-center h-full w-full bg-black text-white",children:e.jsxs("div",{className:"text-center space-y-6",children:[e.jsxs("div",{className:"relative w-16 h-16 mx-auto",children:[e.jsx("div",{className:"absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse"}),e.jsx("div",{className:"relative animate-spin rounded-full h-16 w-16 border-[3px] border-white/20 border-t-indigo-400"})]}),e.jsx("div",{className:"space-y-2",children:e.jsx("p",{className:"text-base text-white/80 font-medium",children:"Загружаем..."})})]})}),l=({message:m="Загрузка..."})=>e.jsx("div",{className:"flex items-center justify-center p-8 bg-black/30 rounded-lg",children:e.jsxs("div",{className:"text-center space-y-3",children:[e.jsx(u,{size:32,className:"mx-auto animate-spin text-indigo-400"}),e.jsx("p",{className:"text-sm text-white/60",children:m})]})}),c=i;t.__docgenInfo={description:`Компонент загрузки для модальных окон
Используется в Suspense fallback для модальных окон`,methods:[],displayName:"ModalLoadingFallback"};i.__docgenInfo={description:`Компонент загрузки для страниц
Используется в Suspense fallback для полноэкранных страниц`,methods:[],displayName:"PageLoadingFallback"};l.__docgenInfo={description:`Компонент загрузки для небольших компонентов
Используется в Suspense fallback для встроенных компонентов`,methods:[],displayName:"ComponentLoadingFallback",props:{message:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Загрузка...'",computed:!1}}}};const j={title:"UI/LoadingFallback",component:c,tags:["autodocs"],parameters:{layout:"fullscreen",backgrounds:{default:"dark",values:[{name:"dark",value:"#000000"}]}}},a={render:()=>e.jsx(i,{})},s={render:()=>e.jsx(t,{})},r={render:()=>e.jsx("div",{className:"p-8",children:e.jsx(l,{})})},n={render:()=>e.jsx("div",{className:"p-8",children:e.jsx(l,{message:"Загрузка данных..."})})},d={render:()=>e.jsx(c,{})},o={render:()=>e.jsxs("div",{className:"space-y-8 p-8",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-white mb-4",children:"Page Loading"}),e.jsx("div",{className:"h-64 border border-white/10 rounded-lg overflow-hidden",children:e.jsx(i,{})})]}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-white mb-4",children:"Modal Loading"}),e.jsx("div",{className:"h-64 border border-white/10 rounded-lg overflow-hidden relative",children:e.jsx(t,{})})]}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-white mb-4",children:"Component Loading"}),e.jsx(l,{})]})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <PageLoadingFallback />
}`,...a.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <ModalLoadingFallback />
}`,...s.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div className="p-8">
      <ComponentLoadingFallback />
    </div>
}`,...r.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <div className="p-8">
      <ComponentLoadingFallback message="Загрузка данных..." />
    </div>
}`,...n.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <LoadingFallback />
}`,...d.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div className="space-y-8 p-8">
      <div>
        <h3 className="text-white mb-4">Page Loading</h3>
        <div className="h-64 border border-white/10 rounded-lg overflow-hidden">
          <PageLoadingFallback />
        </div>
      </div>
      <div>
        <h3 className="text-white mb-4">Modal Loading</h3>
        <div className="h-64 border border-white/10 rounded-lg overflow-hidden relative">
          <ModalLoadingFallback />
        </div>
      </div>
      <div>
        <h3 className="text-white mb-4">Component Loading</h3>
        <ComponentLoadingFallback />
      </div>
    </div>
}`,...o.parameters?.docs?.source}}};const N=["Page","Modal","Component","ComponentWithMessage","Default","AllTypes"];export{o as AllTypes,r as Component,n as ComponentWithMessage,d as Default,s as Modal,a as Page,N as __namedExportsOrder,j as default};
