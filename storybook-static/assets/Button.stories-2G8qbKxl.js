import{j as r}from"./iframe-D0Nje-x_.js";import{B as a}from"./Button-BWGzIklL.js";import{S as c}from"./sparkles-C__5GnET.js";import{c as d}from"./createLucideIcon-Cg4GjVm3.js";import"./preload-helper-PPVm8Dsz.js";import"./loader-circle-DySi1wl5.js";const l=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],m=d("arrow-right",l),f={title:"UI/Button",component:a,tags:["autodocs"],parameters:{layout:"centered"},args:{children:"Кнопка",variant:"primary",size:"md"}},t={},n={render:e=>r.jsxs("div",{className:"flex flex-wrap gap-3",children:[r.jsx(a,{...e,variant:"primary",children:"Primary"}),r.jsx(a,{...e,variant:"secondary",children:"Secondary"}),r.jsx(a,{...e,variant:"tertiary",children:"Tertiary"}),r.jsx(a,{...e,variant:"ghost",children:"Ghost"})]})},s={render:e=>r.jsxs("div",{className:"flex flex-wrap gap-3 items-center",children:[r.jsx(a,{...e,size:"sm",children:"Small"}),r.jsx(a,{...e,size:"md",children:"Medium"}),r.jsx(a,{...e,size:"lg",children:"Large"})]})},o={render:e=>r.jsxs("div",{className:"flex flex-wrap gap-3",children:[r.jsx(a,{...e,leadingIcon:r.jsx(c,{className:"w-4 h-4"}),children:"С иконкой"}),r.jsx(a,{...e,trailingIcon:r.jsx(m,{className:"w-4 h-4"}),variant:"secondary",children:"Справа"})]})},i={render:e=>r.jsxs("div",{className:"flex flex-wrap gap-3 items-center",children:[r.jsx(a,{...e,children:"Default"}),r.jsx(a,{...e,isLoading:!0,children:"Загрузка"}),r.jsx(a,{...e,disabled:!0,variant:"tertiary",children:"Disabled"}),r.jsx(a,{...e,fullWidth:!0,children:"Full width"})]})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-wrap gap-3">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="tertiary">
        Tertiary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
    </div>
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-wrap gap-3 items-center">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-wrap gap-3">
      <Button {...args} leadingIcon={<Sparkles className="w-4 h-4" />}>
        С иконкой
      </Button>
      <Button {...args} trailingIcon={<ArrowRight className="w-4 h-4" />} variant="secondary">
        Справа
      </Button>
    </div>
}`,...o.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: args => <div className="flex flex-wrap gap-3 items-center">
      <Button {...args}>Default</Button>
      <Button {...args} isLoading>
        Загрузка
      </Button>
      <Button {...args} disabled variant="tertiary">
        Disabled
      </Button>
      <Button {...args} fullWidth>
        Full width
      </Button>
    </div>
}`,...i.parameters?.docs?.source}}};const v=["Playground","Variants","Sizes","WithIcons","States"];export{t as Playground,s as Sizes,i as States,n as Variants,o as WithIcons,v as __namedExportsOrder,f as default};
