# План рефакторинга самых больших файлов проекта

## Обзор

План рефакторинга для 5 самых больших файлов исходного кода:

1. **AdminPage.tsx** - 104K, 2101 строка
2. **App.tsx** - 88K, 2162 строки  
3. **ProjectDocumentsModal.tsx** - 52K, 1067 строк
4. **backend/src/routes/agents.ts** - 48K, 1353 строки
5. **backend/src/routes/adminAgents.ts** - 36K, 927 строк

---

## 1. AdminPage.tsx (104K, 2101 строка)

### Проблемы:
- Монолитный компонент с 50+ состояниями
- Смешаны логика управления агентами, типами проектов и пользователями
- Большой диалог редактирования агента (800+ строк) встроен в компонент
- Дублирование логики автосохранения и localStorage
- Сложная логика фильтрации и сортировки

### План рефакторинга:

#### 1.1. Разделить на подкомпоненты:
```
components/admin/
├── AdminPage.tsx (~100 строк - только роутинг по табам)
├── AdminHeader.tsx (~50 строк - заголовок и кнопка закрытия)
├── AdminTabs.tsx (~50 строк - переключатель табов)
├── tabs/
│   ├── AgentsTab/
│   │   ├── AgentsTab.tsx (~100 строк - оркестрация)
│   │   ├── AgentsList.tsx (~150 строк - список агентов)
│   │   ├── AgentsFilters.tsx (~100 строк - фильтры)
│   │   │   ├── SearchInput.tsx (~30 строк)
│   │   │   ├── ProjectTypeFilter.tsx (~40 строк)
│   │   │   ├── RoleFilter.tsx (~40 строк)
│   │   │   └── ModelFilter.tsx (~40 строк)
│   │   ├── AgentsSort.tsx (~50 строк - сортировка)
│   │   └── AgentCard.tsx (~80 строк - карточка агента)
│   ├── ProjectTypesTab.tsx (уже существует как AdminProjectTypesTab)
│   └── UsersTab.tsx (уже существует как AdminUsersTab)
└── dialogs/
    ├── AgentDialog/
    │   ├── AgentDialog.tsx (~150 строк - главный компонент, оркестрация)
    │   ├── AgentDialogHeader.tsx (~50 строк - заголовок диалога)
    │   ├── AgentDialogFooter.tsx (~50 строк - футер с кнопками)
    │   ├── AgentAutoSaveIndicator.tsx (~50 строк - индикатор автосохранения)
    │   ├── sections/
    │   │   ├── AgentBasicInfo/
    │   │   │   ├── AgentBasicInfo.tsx (~80 строк - секция)
    │   │   │   ├── AgentNameInput.tsx (~50 строк - поле имени)
    │   │   │   └── AgentDescriptionInput.tsx (~50 строк - поле описания)
    │   │   ├── AgentInstructions/
    │   │   │   ├── AgentInstructions.tsx (~80 строк - секция)
    │   │   │   ├── SystemInstructionInput.tsx (~80 строк - системная инструкция)
    │   │   │   └── SummaryInstructionInput.tsx (~60 строк - инструкция сохранения)
    │   │   ├── AgentModelConfig/
    │   │   │   ├── AgentModelConfig.tsx (~80 строк - секция)
    │   │   │   ├── ModelSelector.tsx (~100 строк - выбор модели)
    │   │   │   └── ModelBadge.tsx (~30 строк - бейдж модели)
    │   │   ├── AgentProjectBindings/
    │   │   │   ├── AgentProjectBindings.tsx (~80 строк - секция)
    │   │   │   ├── ProjectTypesSelector.tsx (~150 строк - мультиселект)
    │   │   │   │   ├── ProjectTypesDropdown.tsx (~80 строк - дропдаун)
    │   │   │   │   └── SelectedProjectTypes.tsx (~50 строк - выбранные типы)
    │   │   │   └── RoleSelector.tsx (~100 строк - выбор роли)
    │   │   ├── AgentKnowledgeBase/
    │   │   │   ├── AgentKnowledgeBase.tsx (~100 строк - секция)
    │   │   │   ├── FileUploadZone.tsx (~80 строк - зона загрузки)
    │   │   │   ├── FileList.tsx (~60 строк - список файлов)
    │   │   │   └── FileItem.tsx (~50 строк - элемент файла)
    │   │   ├── AgentGlobalPrompt/
    │   │   │   ├── AgentGlobalPrompt.tsx (~100 строк - секция)
    │   │   │   └── GlobalPromptEditor.tsx (~80 строк - редактор)
    │   │   └── AgentVisibilitySettings/
    │   │       ├── AgentVisibilitySettings.tsx (~50 строк - секция)
    │   │       └── VisibilityToggle.tsx (~30 строк - переключатель)
    │   └── ConfirmDialog.tsx (уже существует)
```

#### 1.2. Вынести хуки:
```
hooks/admin/
├── useAdminAgents.ts (~100 строк - загрузка и CRUD агентов)
├── useAdminProjectTypes.ts (~80 строк - управление типами проектов)
├── useAdminUsers.ts (~80 строк - управление пользователями)
├── useAgentDialog.ts (~150 строк - состояние и логика диалога)
├── useAgentForm.ts (~100 строк - управление формой агента)
├── useAgentAutoSave.ts (~80 строк - автосохранение с debounce)
├── useAgentDraft.ts (~60 строк - работа с черновиками в localStorage)
├── useAgentFilters.ts (~100 строк - фильтры и их состояние)
├── useAgentSort.ts (~50 строк - сортировка)
├── useAgentFileUpload.ts (~100 строк - загрузка файлов)
├── useGlobalPrompt.ts (~80 строк - глобальный промт)
└── useProjectTypesDropdown.ts (~60 строк - логика дропдауна типов проектов)
```

#### 1.3. Вынести утилиты:
```
utils/admin/
├── agentStorage.ts (работа с localStorage для черновиков)
├── agentValidation.ts (валидация данных агента)
└── agentHelpers.ts (вспомогательные функции)
```

#### Ожидаемый результат:
- AdminPage.tsx: ~100 строк (только роутинг)
- AdminHeader.tsx: ~50 строк
- AdminTabs.tsx: ~50 строк
- AgentsTab.tsx: ~100 строк (оркестрация)
- AgentDialog.tsx: ~150 строк (оркестрация)
- Каждый подкомпонент секции: 30-80 строк
- Каждый хук: 50-150 строк
- **Общее количество файлов**: ~40-50 файлов вместо 1 монолитного

---

## 2. App.tsx (88K, 2162 строки)

### Проблемы:
- Главный компонент приложения с множеством ответственностей
- Смешаны: аутентификация, роутинг, управление проектами, чат, документы
- Много бизнес-логики напрямую в компоненте
- Сложная логика bootstrap и загрузки данных
- Множество состояний (30+ useState)

### План рефакторинга:

#### 2.1. Разделить на контексты и провайдеры:
```
contexts/
├── AuthContext.tsx (~150 строк - аутентификация и пользователь)
├── ProjectContext.tsx (~150 строк - проекты и активный проект)
├── AgentContext.tsx (~150 строк - агенты и активный агент)
├── ChatContext.tsx (~150 строк - история чата и сообщения)
└── DocumentsContext.tsx (~100 строк - документы проекта)
```

#### 2.2. Вынести хуки (детальное разбиение):
```
hooks/
├── auth/
│   ├── useAuth.ts (~100 строк - основная логика аутентификации)
│   ├── useLogin.ts (~50 строк - логин)
│   ├── useRegister.ts (~50 строк - регистрация)
│   └── useLogout.ts (~30 строк - выход)
├── bootstrap/
│   ├── useBootstrap.ts (~150 строк - основная логика загрузки)
│   ├── useUserLoader.ts (~50 строк - загрузка пользователя)
│   ├── useProjectsLoader.ts (~50 строк - загрузка проектов)
│   └── useAgentsLoader.ts (~50 строк - загрузка агентов)
├── projects/
│   ├── useProjects.ts (~100 строк - управление проектами)
│   ├── useCreateProject.ts (~50 строк - создание проекта)
│   ├── useUpdateProject.ts (~50 строк - обновление проекта)
│   ├── useDeleteProject.ts (~50 строк - удаление проекта)
│   └── useSelectProject.ts (~50 строк - выбор проекта)
├── agents/
│   ├── useAgents.ts (~100 строк - управление агентами)
│   ├── useSelectAgent.ts (~50 строк - выбор агента)
│   └── useReloadAgents.ts (~50 строк - перезагрузка агентов)
├── chat/
│   ├── useChat.ts (~100 строк - основная логика чата)
│   ├── useSendMessage.ts (~80 строк - отправка сообщения)
│   └── useClearChat.ts (~50 строк - очистка чата)
├── messages/
│   ├── useMessages.ts (~100 строк - загрузка сообщений)
│   ├── useLoadMessages.ts (~60 строк - загрузка для агента)
│   └── useMessageCache.ts (~50 строк - кеширование сообщений)
├── documents/
│   ├── useDocuments.ts (~100 строк - управление документами)
│   ├── useLoadDocuments.ts (~60 строк - загрузка документов)
│   ├── useRemoveDocument.ts (~50 строк - удаление документа)
│   └── useGenerateSummary.ts (~80 строк - генерация саммари)
├── files/
│   ├── useFileUpload.ts (~100 строк - загрузка файлов)
│   └── useFileValidation.ts (~50 строк - валидация файлов)
└── routing/
    ├── useRouting.ts (~100 строк - роутинг и навигация)
    ├── useHashRouting.ts (~80 строк - hash-based роутинг)
    └── usePageState.ts (~60 строк - состояние страниц)
```

#### 2.3. Вынести сервисы (детальное разбиение):
```
services/
├── authService.ts (~100 строк - API вызовы для аутентификации)
├── projectService.ts (~150 строк - API вызовы для проектов)
├── agentService.ts (~150 строк - API вызовы для агентов)
├── messageService.ts (~100 строк - API вызовы для сообщений)
└── documentService.ts (~100 строк - API вызовы для документов)
```

#### 2.4. Разделить на страницы и компоненты:
```
pages/
├── LandingPage.tsx (уже существует)
├── AuthPage.tsx (уже существует)
├── WorkspacePage/
│   ├── WorkspacePage.tsx (~150 строк - главная страница)
│   ├── WorkspaceHeader.tsx (~100 строк - заголовок)
│   │   ├── AgentName.tsx (~30 строк - имя агента)
│   │   ├── ModelBadge.tsx (~40 строк - бейдж модели)
│   │   └── HeaderActions.tsx (~50 строк - действия)
│   ├── ChatArea/
│   │   ├── ChatArea.tsx (~100 строк - область чата)
│   │   ├── MessagesList.tsx (~80 строк - список сообщений)
│   │   ├── EmptyChatState.tsx (~60 строк - пустое состояние)
│   │   └── MessageSkeleton.tsx (уже существует)
│   └── ChatInput.tsx (уже существует)
├── EmptyStatePage/
│   ├── EmptyStatePage.tsx (~100 строк - главный компонент)
│   ├── EmptyProjectsState.tsx (~80 строк - нет проектов)
│   └── EmptyAgentsState.tsx (~80 строк - нет агентов)
└── PaymentRequiredPage.tsx (~80 строк - требуется оплата)
```

#### Ожидаемый результат:
- App.tsx: ~150 строк (только роутинг и провайдеры)
- Каждый контекст: 100-150 строк
- Каждый хук: 30-150 строк (в зависимости от сложности)
- WorkspacePage.tsx: ~150 строк (оркестрация)
- WorkspaceHeader.tsx: ~100 строк
- ChatArea.tsx: ~100 строк
- Каждый подкомпонент: 30-100 строк
- **Общее количество файлов**: ~60-70 файлов вместо 1 монолитного

---

## 3. ProjectDocumentsModal.tsx (52K, 1067 строк)

### Проблемы:
- Большой модальный компонент с множеством функций
- Смешаны: просмотр документов, редактирование, генерация прототипов
- Сложная логика переключения табов и подтабов
- Много условной логики для разных типов документов

### План рефакторинга:

#### 3.1. Разделить на подкомпоненты (детальное разбиение):
```
components/ProjectDocumentsModal/
├── ProjectDocumentsModal.tsx (~150 строк - главный компонент, оркестрация)
├── DocumentsSidebar/
│   ├── DocumentsSidebar.tsx (~100 строк - сайдбар)
│   ├── SidebarHeader.tsx (~50 строк - заголовок сайдбара)
│   ├── DocumentsList.tsx (~80 строк - список документов)
│   ├── DocumentItem.tsx (~60 строк - элемент списка)
│   └── EmptyDocumentsState.tsx (~50 строк - пустое состояние)
├── DocumentViewer/
│   ├── DocumentViewer.tsx (~100 строк - главный компонент просмотра)
│   ├── DocumentHeader/
│   │   ├── DocumentHeader.tsx (~80 строк - заголовок)
│   │   ├── DocumentMetadata.tsx (~50 строк - метаданные)
│   │   │   ├── AgentBadge.tsx (~30 строк - бейдж агента)
│   │   │   └── DocumentDate.tsx (~30 строк - дата документа)
│   │   └── DocumentActions.tsx (~100 строк - действия)
│   │       ├── EditButton.tsx (~30 строк)
│   │       ├── DownloadButton.tsx (~30 строк)
│   │       └── DeleteButton.tsx (~30 строк)
│   ├── DocumentTabs/
│   │   ├── DocumentTabs.tsx (~80 строк - переключатель табов)
│   │   ├── TextTab.tsx (~30 строк - таб текста)
│   │   └── PrototypeTab.tsx (~30 строк - таб прототипа)
│   ├── views/
│   │   ├── TextDocumentView.tsx (~80 строк - просмотр текста)
│   │   │   └── MarkdownRenderer.tsx (уже существует)
│   │   ├── ImageDocumentView.tsx (~50 строк - просмотр изображений)
│   │   └── PrototypeView/
│   │       ├── PrototypeView.tsx (~100 строк - главный компонент)
│   │       ├── PrototypeSubTabs.tsx (~60 строк - подтабы)
│   │       ├── PrototypePreview.tsx (~60 строк - iframe превью)
│   │       ├── PrototypeDSL.tsx (~60 строк - DSL код)
│   │       ├── PrototypeHTML.tsx (~60 строк - HTML код)
│   │       └── PrototypeActions.tsx (~50 строк - действия прототипа)
│   └── DocumentEditor/
│       ├── DocumentEditor.tsx (~80 строк - редактор)
│       ├── EditorToolbar.tsx (~50 строк - панель инструментов)
│       └── EditorTextarea.tsx (~50 строк - текстовое поле)
└── FullscreenPrototype/
    ├── FullscreenPrototype.tsx (~80 строк - полноэкранный режим)
    └── FullscreenHeader.tsx (~50 строк - заголовок)
```

#### 3.2. Вынести хуки (детальное разбиение):
```
hooks/documents/
├── useDocumentViewer.ts (~100 строк - основная логика просмотра)
├── useDocumentSelection.ts (~50 строк - выбор документа)
├── useDocumentTabs.ts (~80 строк - логика табов и подтабов)
├── useDocumentEditor.ts (~80 строк - логика редактирования)
├── useDocumentSave.ts (~50 строк - сохранение документа)
├── usePrototypeGeneration.ts (~100 строк - генерация прототипов)
├── usePrototypeFullscreen.ts (~50 строк - полноэкранный режим)
└── useDocumentActions.ts (~80 строк - действия с документами)
```

#### 3.3. Вынести утилиты:
```
utils/
├── documentHelpers.ts (форматирование, парсинг имен файлов)
├── prototypeHelpers.ts (работа с прототипами)
└── fileHelpers.ts (работа с файлами)
```

#### Ожидаемый результат:
- ProjectDocumentsModal.tsx: ~150 строк (оркестрация)
- DocumentsSidebar.tsx: ~100 строк
- DocumentViewer.tsx: ~100 строк
- Каждый подкомпонент: 30-100 строк
- Хуки: 50-100 строк каждый
- **Общее количество файлов**: ~25-30 файлов вместо 1 монолитного

---

## 4. backend/src/routes/agents.ts (48K, 1353 строки)

### Проблемы:
- Большой роутер с множеством эндпоинтов
- Смешаны: CRUD операции, сообщения, файлы, генерация
- Сложная логика getOrCreateAgentFromTemplate (200+ строк)
- Дублирование логики работы с файлами

### План рефакторинга:

#### 4.1. Разделить на контроллеры (детальное разбиение):
```
controllers/agents/
├── agentsController.ts (~150 строк - CRUD операции)
│   ├── getAgents() (~80 строк)
│   └── handleAgentErrors() (~50 строк)
├── messagesController.ts (~200 строк - работа с сообщениями)
│   ├── getMessages() (~60 строк)
│   ├── sendMessage() (~100 строк)
│   └── clearMessages() (~30 строк)
├── filesController.ts (~200 строк - работа с файлами)
│   ├── getAgentFiles() (~60 строк)
│   ├── getProjectFiles() (~60 строк)
│   ├── deleteFile() (~50 строк)
│   └── updateFile() (~50 строк)
├── summaryController.ts (~100 строк - генерация саммари)
│   └── generateSummary() (~80 строк)
└── prototypeController.ts (~150 строк - генерация прототипов)
    └── generatePrototype() (~120 строк)
```

#### 4.2. Вынести сервисы (детальное разбиение):
```
services/agents/
├── agentTemplateService.ts (~200 строк - работа с шаблонами)
│   ├── getOrCreateAgentFromTemplate() (~150 строк - основная логика)
│   ├── findAgentTemplate() (~30 строк)
│   ├── createAgentFromTemplate() (~50 строк)
│   └── verifyProjectAccess() (~30 строк)
├── agentService.ts (~150 строк - работа с агентами)
│   ├── getNextOrderValue() (~30 строк)
│   ├── findAgent() (~30 строк)
│   └── syncProjectAgents() (~50 строк)
├── knowledgeBaseService.ts (~150 строк - база знаний)
│   ├── cloneTemplateKnowledgeBase() (~50 строк)
│   ├── loadAgentKnowledgeBase() (~50 строк)
│   └── loadTemplateKnowledgeBase() (~50 строк)
├── messageService.ts (~200 строк - сообщения)
│   ├── loadMessages() (~50 строк)
│   ├── sendMessage() (~100 строк)
│   │   ├── prepareAgentContext() (~40 строк)
│   │   ├── loadConversationHistory() (~30 строк)
│   │   └── generateResponse() (~30 строк)
│   └── clearMessages() (~30 строк)
├── fileService.ts (~200 строк - файлы)
│   ├── loadAgentFiles() (~50 строк)
│   ├── loadProjectFiles() (~60 строк)
│   ├── loadTemplateFiles() (~50 строк)
│   └── prepareFilesForAgent() (~40 строк)
└── prototypeService.ts (~150 строк - прототипы)
    ├── findDSLAgent() (~40 строк)
    ├── findVerstkaAgent() (~40 строк)
    ├── generateDSL() (~40 строк)
    └── generateHTML() (~40 строк)
```

#### 4.3. Разделить роуты (детальное разбиение):
```
routes/agents/
├── index.ts (~50 строк - главный роутер, только маршрутизация)
├── agents.routes.ts (~80 строк - CRUD агентов)
│   ├── GET / (список агентов)
│   └── валидация и обработка ошибок
├── messages.routes.ts (~150 строк - сообщения)
│   ├── GET /:agentId/messages
│   ├── POST /:agentId/messages
│   └── DELETE /:agentId/messages
├── files.routes.ts (~200 строк - файлы)
│   ├── GET /:agentId/files
│   ├── GET /:agentId/files/summary
│   ├── DELETE /files/:fileId
│   └── PATCH /files/:fileId
├── summary.routes.ts (~80 строк - саммари)
│   └── POST /:agentId/summary
└── prototype.routes.ts (~100 строк - прототипы)
    └── POST /:agentId/files/:fileId/generate-prototype
```

#### Ожидаемый результат:
- index.ts: ~50 строк (только маршрутизация)
- Каждый контроллер: 100-200 строк
- Каждый сервис: 30-200 строк (в зависимости от сложности)
- Каждый роут: 50-200 строк
- **Общее количество файлов**: ~20-25 файлов вместо 1 монолитного

---

## 5. backend/src/routes/adminAgents.ts (36K, 927 строк)

### Проблемы:
- Большой роутер для админки
- Смешаны: CRUD агентов-шаблонов, файлы, привязки к типам проектов
- Дублирование логики проверки существования таблиц
- Сложная обработка ошибок Prisma

### План рефакторинга:

#### 5.1. Разделить на контроллеры (детальное разбиение):
```
controllers/admin/
├── adminAgentsController.ts (~200 строк - CRUD агентов-шаблонов)
│   ├── getAllAgents() (~80 строк)
│   ├── getAgent() (~50 строк)
│   ├── createAgent() (~50 строк)
│   ├── updateAgent() (~50 строк)
│   └── deleteAgent() (~50 строк)
├── adminAgentFilesController.ts (~200 строк - файлы)
│   ├── getAgentFiles() (~60 строк)
│   ├── uploadAgentFile() (~80 строк)
│   └── deleteAgentFile() (~50 строк)
└── adminAgentProjectTypesController.ts (~150 строк - привязки)
    ├── getProjectTypes() (~50 строк)
    ├── attachToProjectTypes() (~60 строк)
    └── detachFromProjectType() (~40 строк)
```

#### 5.2. Вынести сервисы (детальное разбиение):
```
services/admin/
├── adminAgentService.ts (~200 строк - CRUD агентов)
│   ├── createAgentTemplate() (~50 строк)
│   ├── updateAgentTemplate() (~50 строк)
│   ├── deleteAgentTemplate() (~60 строк)
│   │   ├── findProjectTypeConnections() (~30 строк)
│   │   └── syncProjectTypes() (~30 строк)
│   └── getAgentTemplate() (~50 строк)
├── adminAgentFileService.ts (~200 строк - файлы)
│   ├── uploadAgentFile() (~80 строк)
│   │   ├── validateFile() (~30 строк)
│   │   ├── checkColumnExists() (~30 строк)
│   │   └── createFile() (~30 строк)
│   ├── getAgentFiles() (~60 строк)
│   │   └── checkColumnExists() (~30 строк)
│   └── deleteAgentFile() (~50 строк)
└── adminAgentProjectTypeService.ts (~150 строк - привязки)
    ├── attachToProjectTypes() (~80 строк)
    │   ├── validateProjectTypes() (~40 строк)
    │   └── createConnections() (~40 строк)
    ├── detachFromProjectType() (~40 строк)
    └── getProjectTypes() (~40 строк)
```

#### 5.3. Вынести утилиты (детальное разбиение):
```
utils/admin/
├── prismaHelpers.ts (~100 строк - работа с Prisma)
│   ├── checkTableExists() (~30 строк)
│   ├── checkColumnExists() (~30 строк)
│   └── handlePrismaError() (~40 строк)
├── errorHandlers.ts (~150 строк - обработка ошибок)
│   ├── handleTableNotFoundError() (~40 строк)
│   ├── handleColumnNotFoundError() (~40 строк)
│   ├── handleValidationError() (~40 строк)
│   └── formatPrismaError() (~30 строк)
└── validation.ts (~100 строк - валидация)
    ├── validateAgentTemplate() (~40 строк)
    ├── validateFile() (~30 строк)
    └── validateProjectTypeIds() (~30 строк)
```

#### 5.4. Разделить роуты (детальное разбиение):
```
routes/admin/
├── agents/
│   ├── index.ts (~50 строк - главный роутер)
│   ├── agents.routes.ts (~150 строк - CRUD)
│   │   ├── GET / (список)
│   │   ├── GET /:id (один агент)
│   │   ├── POST / (создание)
│   │   ├── PUT /:id (обновление)
│   │   └── DELETE /:id (удаление)
│   ├── files.routes.ts (~150 строк - файлы)
│   │   ├── GET /:id/files
│   │   ├── POST /:id/files
│   │   └── DELETE /:id/files/:fileId
│   └── projectTypes.routes.ts (~100 строк - привязки)
│       ├── GET /:id/project-types
│       ├── POST /:id/project-types
│       └── DELETE /:id/project-types/:projectTypeId
```

#### Ожидаемый результат:
- index.ts: ~50 строк
- Каждый контроллер: 150-200 строк
- Каждый сервис: 150-200 строк
- Каждый роут: 50-150 строк
- Утилиты: 30-150 строк каждая
- **Общее количество файлов**: ~15-20 файлов вместо 1 монолитного

---

## Общие принципы рефакторинга:

1. **Single Responsibility Principle** - каждый модуль отвечает за одну вещь
2. **DRY (Don't Repeat Yourself)** - убрать дублирование кода
3. **Separation of Concerns** - разделить логику, представление и данные
4. **Composition over Inheritance** - использовать композицию компонентов
5. **Extract Hooks** - выносить логику в переиспользуемые хуки
6. **Extract Services** - выносить бизнес-логику в сервисы
7. **Type Safety** - сохранить и улучшить типизацию TypeScript

## Порядок выполнения:

1. **Этап 1**: Рефакторинг backend роутов (agents.ts, adminAgents.ts)
   - Меньше зависимостей от UI
   - Проще тестировать
   - Быстрее даст результат

2. **Этап 2**: Рефакторинг ProjectDocumentsModal.tsx
   - Относительно изолированный компонент
   - Меньше зависимостей

3. **Этап 3**: Рефакторинг AdminPage.tsx
   - Сложный компонент, но изолированный

4. **Этап 4**: Рефакторинг App.tsx
   - Самый сложный, затрагивает всю архитектуру
   - Требует тщательного планирования

## Метрики успеха:

- Уменьшение размера файлов на 60-80%
- Улучшение читаемости (меньше строк на компонент/модуль)
- Улучшение тестируемости (изолированные модули)
- Улучшение переиспользуемости (вынесенные хуки и сервисы)
- Сохранение функциональности (все должно работать как раньше)

## Итоговая статистика разбиения:

### До рефакторинга:
- **5 монолитных файлов** (~6,500 строк кода)
- Средний размер файла: ~1,300 строк
- Максимальный размер: 2,162 строки (App.tsx)

### После рефакторинга:
- **~160-185 файлов** (разбиение на мелкие модули)
- Средний размер файла: ~50-150 строк
- Максимальный размер: ~200 строк (только оркестрационные компоненты)

### Детальное разбиение по файлам:

1. **AdminPage.tsx** (2,101 строка) → **~40-50 файлов**
   - Компоненты: ~25-30 файлов
   - Хуки: ~12 файлов
   - Утилиты: ~3 файла

2. **App.tsx** (2,162 строки) → **~60-70 файлов**
   - Контексты: 5 файлов
   - Хуки: ~25-30 файлов
   - Сервисы: 5 файлов
   - Страницы/компоненты: ~25-30 файлов

3. **ProjectDocumentsModal.tsx** (1,067 строк) → **~25-30 файлов**
   - Компоненты: ~20 файлов
   - Хуки: ~8 файлов
   - Утилиты: ~3 файла

4. **backend/routes/agents.ts** (1,353 строки) → **~20-25 файлов**
   - Контроллеры: 5 файлов
   - Сервисы: ~6 файлов
   - Роуты: 6 файлов

5. **backend/routes/adminAgents.ts** (927 строк) → **~15-20 файлов**
   - Контроллеры: 3 файла
   - Сервисы: 3 файла
   - Утилиты: 3 файла
   - Роуты: 4 файла

### Преимущества детального разбиения:

1. **Читаемость**: Каждый файл отвечает за одну конкретную задачу
2. **Тестируемость**: Легко писать unit-тесты для маленьких модулей
3. **Переиспользование**: Мелкие компоненты и хуки можно использовать в разных местах
4. **Поддержка**: Легче найти и исправить баги в маленьких файлах
5. **Параллельная разработка**: Несколько разработчиков могут работать над разными модулями одновременно
6. **Code Review**: Проще ревьюить маленькие изменения
7. **Onboarding**: Новым разработчикам проще понять маленькие модули

### Рекомендации по размеру файлов:

- **Компоненты UI**: 30-150 строк (идеально 50-100)
- **Хуки**: 30-150 строк (идеально 50-100)
- **Сервисы**: 50-200 строк (идеально 100-150)
- **Контроллеры**: 100-200 строк
- **Роуты**: 50-150 строк
- **Утилиты**: 30-100 строк
- **Контексты**: 100-150 строк

### Принцип "одна ответственность":

Каждый файл должен отвечать за:
- **Один компонент** (например, AgentNameInput.tsx)
- **Один хук** (например, useAgentAutoSave.ts)
- **Один сервис** (например, agentTemplateService.ts)
- **Один тип данных** (например, agentTypes.ts)
- **Одну утилиту** (например, agentValidation.ts)

