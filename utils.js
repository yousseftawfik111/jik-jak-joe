export function appendMultipleCreatedElements(
  parent,
  childTag,
  cssClasses,
  data,
  count,
) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const newChild = document.createElement(childTag);

    if (cssClasses && cssClasses.length > 0) {
      newChild.classList.add(...cssClasses);
    }

    if (data) {
      newChild.setAttribute(`data-${data}`, i);
    }

    fragment.appendChild(newChild);
  }

  parent.appendChild(fragment);
}
