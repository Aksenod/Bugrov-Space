/**
 * Хелперы для редактирования секций в прототипе
 */

// Типы для редактирования секций
export interface SelectedSection {
  id: string;           // data-section-id
  html: string;         // outerHTML секции
  innerHtml: string;    // innerHTML секции
  tagName: string;      // Тег элемента
  selector: string;     // CSS selector для поиска
}

export interface SectionEditState {
  isEditMode: boolean;
  selectedSection: SelectedSection | null;
  editPrompt: string;
  isProcessing: boolean;
  previewHtml: string | null;
}

// Сообщения для postMessage API
export interface SectionSelectedMessage {
  type: 'SECTION_SELECTED';
  sectionId: string;
  html: string;
  innerHtml: string;
  tagName: string;
}

export interface EditModeMessage {
  type: 'EDIT_MODE_ENABLED' | 'EDIT_MODE_DISABLED';
}

export type IframeMessage = SectionSelectedMessage | EditModeMessage;

/**
 * Скрипт для инъекции в iframe
 * Добавляет интерактивность для выделения и выбора секций
 */
export const SECTION_EDIT_SCRIPT = `
<script>
(function() {
  // Селекторы для элементов, которые можно редактировать
  const EDITABLE_SELECTORS = 'section, article, header, footer, main, aside, nav, div[class], [data-section]';

  // Минимальный размер элемента для редактирования (в пикселях)
  const MIN_SIZE = 50;

  let sectionId = 0;
  let isEditMode = false;
  let currentHovered = null;

  // Стили для подсветки
  const highlightStyle = document.createElement('style');
  highlightStyle.id = 'section-edit-styles';
  highlightStyle.textContent = \`
    [data-section-id].section-edit-hover {
      outline: 2px solid #6366f1 !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
      position: relative;
    }
    [data-section-id].section-edit-hover::after {
      content: 'Кликните для редактирования';
      position: absolute;
      top: 4px;
      right: 4px;
      background: #6366f1;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 10000;
      pointer-events: none;
    }
  \`;

  // Разметка элементов data-section-id
  function markSections() {
    document.querySelectorAll(EDITABLE_SELECTORS).forEach(el => {
      // Пропускаем слишком маленькие элементы
      const rect = el.getBoundingClientRect();
      if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return;

      // Пропускаем если уже размечен
      if (el.dataset.sectionId) return;

      // Пропускаем вложенные элементы с тем же тегом
      const parent = el.parentElement?.closest('[data-section-id]');
      if (parent && parent.tagName === el.tagName) return;

      el.dataset.sectionId = 'section-' + sectionId++;
    });
  }

  // Включение режима редактирования
  function enableEditMode() {
    isEditMode = true;
    markSections();
    if (!document.getElementById('section-edit-styles')) {
      document.head.appendChild(highlightStyle);
    }
  }

  // Выключение режима редактирования
  function disableEditMode() {
    isEditMode = false;
    if (currentHovered) {
      currentHovered.classList.remove('section-edit-hover');
      currentHovered = null;
    }
    const styles = document.getElementById('section-edit-styles');
    if (styles) styles.remove();
  }

  // Обработчик наведения
  function handleMouseOver(e) {
    if (!isEditMode) return;

    const section = e.target.closest('[data-section-id]');
    if (section && section !== currentHovered) {
      if (currentHovered) {
        currentHovered.classList.remove('section-edit-hover');
      }
      section.classList.add('section-edit-hover');
      currentHovered = section;
    }
  }

  // Обработчик ухода мыши
  function handleMouseOut(e) {
    if (!isEditMode) return;

    const section = e.target.closest('[data-section-id]');
    if (section && !section.contains(e.relatedTarget)) {
      section.classList.remove('section-edit-hover');
      if (currentHovered === section) {
        currentHovered = null;
      }
    }
  }

  // Обработчик клика
  function handleClick(e) {
    if (!isEditMode) return;

    const section = e.target.closest('[data-section-id]');
    if (section) {
      e.preventDefault();
      e.stopPropagation();

      window.parent.postMessage({
        type: 'SECTION_SELECTED',
        sectionId: section.dataset.sectionId,
        html: section.outerHTML,
        innerHtml: section.innerHTML,
        tagName: section.tagName.toLowerCase()
      }, '*');
    }
  }

  // Слушаем сообщения от родительского окна
  window.addEventListener('message', (e) => {
    if (e.data.type === 'EDIT_MODE_ENABLED') {
      enableEditMode();
    } else if (e.data.type === 'EDIT_MODE_DISABLED') {
      disableEditMode();
    }
  });

  // Навешиваем обработчики
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);

  // Сообщаем родителю что скрипт загружен
  window.parent.postMessage({ type: 'SECTION_EDIT_READY' }, '*');
})();
</script>
`;

/**
 * Инъектирует скрипт редактирования в HTML контент
 */
export function injectEditScript(htmlContent: string): string {
  // Проверяем, не инъектирован ли уже скрипт
  if (htmlContent.includes('section-edit-styles')) {
    return htmlContent;
  }

  // Ищем закрывающий тег </body> или </html>
  const bodyCloseIndex = htmlContent.lastIndexOf('</body>');
  const htmlCloseIndex = htmlContent.lastIndexOf('</html>');

  if (bodyCloseIndex !== -1) {
    return htmlContent.slice(0, bodyCloseIndex) + SECTION_EDIT_SCRIPT + htmlContent.slice(bodyCloseIndex);
  } else if (htmlCloseIndex !== -1) {
    return htmlContent.slice(0, htmlCloseIndex) + SECTION_EDIT_SCRIPT + htmlContent.slice(htmlCloseIndex);
  } else {
    // Если нет закрывающих тегов, добавляем в конец
    return htmlContent + SECTION_EDIT_SCRIPT;
  }
}

/**
 * Заменяет секцию в HTML по data-section-id
 */
export function replaceSectionInHtml(
  fullHtml: string,
  sectionId: string,
  newSectionHtml: string
): string {
  // Используем регулярное выражение для поиска и замены секции
  // Ищем элемент с data-section-id="sectionId"
  const regex = new RegExp(
    `(<[^>]+data-section-id=["']${sectionId}["'][^>]*>)([\\s\\S]*?)(<\\/[^>]+>)`,
    'i'
  );

  const match = fullHtml.match(regex);
  if (!match) {
    console.warn(`Section with id ${sectionId} not found in HTML`);
    return fullHtml;
  }

  // Заменяем только содержимое, сохраняя открывающий и закрывающий теги
  return fullHtml.replace(regex, `$1${newSectionHtml}$3`);
}

/**
 * Извлекает чистый HTML без скрипта редактирования
 */
export function removeEditScript(htmlContent: string): string {
  // Удаляем скрипт редактирования
  const scriptStart = htmlContent.indexOf('<script>\n(function() {\n  // Селекторы для элементов');
  if (scriptStart === -1) return htmlContent;

  const scriptEnd = htmlContent.indexOf('</script>', scriptStart);
  if (scriptEnd === -1) return htmlContent;

  return htmlContent.slice(0, scriptStart) + htmlContent.slice(scriptEnd + 9);
}

/**
 * Проверяет, является ли сообщение от iframe сообщением о выборе секции
 */
export function isSectionSelectedMessage(data: unknown): data is SectionSelectedMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as any).type === 'SECTION_SELECTED' &&
    typeof (data as any).sectionId === 'string' &&
    typeof (data as any).html === 'string'
  );
}

/**
 * Создаёт CSS selector из информации о секции
 */
export function buildSectionSelector(section: SelectedSection): string {
  return `[data-section-id="${section.id}"]`;
}
