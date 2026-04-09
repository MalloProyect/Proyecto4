const form = document.getElementById("item-form");
const itemIdInput = document.getElementById("item-id");
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const yearInput = document.getElementById("year");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit");
const nameError = document.getElementById("name-error");
const categoryError = document.getElementById("category-error");
const yearError = document.getElementById("year-error");

const tableBody = document.getElementById("table-body");
const rowTemplate = document.getElementById("row-template");

const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const sortField = document.getElementById("sort-field");
const sortDirectionBtn = document.getElementById("sort-direction");
const pageSizeSelect = document.getElementById("page-size");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");
const deleteModal = document.getElementById("delete-modal");
const cancelDeleteBtn = document.getElementById("cancel-delete");
const confirmDeleteBtn = document.getElementById("confirm-delete");
const deleteModalText = document.getElementById("delete-modal-text");

const STORAGE_KEY = "custom_table_items_v1";

const defaultItems = [
  { id: crypto.randomUUID(), name: "The Legend of Zelda", category: "Videojuego", year: 1986 },
  { id: crypto.randomUUID(), name: "Inception", category: "Pelicula", year: 2010 },
  { id: crypto.randomUUID(), name: "Thriller", category: "Album", year: 1982 },
  { id: crypto.randomUUID(), name: "Don Quijote", category: "Libro", year: 1605 }
];

let items = loadItems();
let pendingDeleteId = null;

const state = {
  search: "",
  category: "all",
  sortField: "name",
  sortDirection: "asc",
  page: 1,
  pageSize: Number.parseInt(pageSizeSelect.value, 10) || 10
};

function normalizeText(value) {
  return value.trim().toLowerCase();
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultItems;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return defaultItems;
    }

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || crypto.randomUUID()),
        name: String(item.name || "").trim(),
        category: String(item.category || "").trim(),
        year: Number.parseInt(item.year, 10)
      }))
      .filter((item) => item.name && item.category && Number.isInteger(item.year));
  } catch {
    return defaultItems;
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function setFieldError(input, errorElement, message) {
  const hasError = Boolean(message);
  errorElement.textContent = message;
  input.classList.toggle("invalid", hasError);
  input.setAttribute("aria-invalid", hasError ? "true" : "false");
}

function clearFieldError(input, errorElement) {
  setFieldError(input, errorElement, "");
}

function validateForm() {
  let isValid = true;
  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const yearRaw = yearInput.value.trim();
  const year = Number.parseInt(yearRaw, 10);

  if (!name) {
    setFieldError(nameInput, nameError, "El nombre es obligatorio.");
    isValid = false;
  } else if (name.length < 2) {
    setFieldError(nameInput, nameError, "Debe tener al menos 2 caracteres.");
    isValid = false;
  } else {
    clearFieldError(nameInput, nameError);
  }

  if (!category) {
    setFieldError(categoryInput, categoryError, "La categoría es obligatoria.");
    isValid = false;
  } else if (category.length < 2) {
    setFieldError(categoryInput, categoryError, "Debe tener al menos 2 caracteres.");
    isValid = false;
  } else {
    clearFieldError(categoryInput, categoryError);
  }

  if (!yearRaw) {
    setFieldError(yearInput, yearError, "El año es obligatorio.");
    isValid = false;
  } else if (!Number.isInteger(year)) {
    setFieldError(yearInput, yearError, "Debe ser un número válido.");
    isValid = false;
  } else if (year < 1000 || year > 2100) {
    setFieldError(yearInput, yearError, "Debe estar entre 1000 y 2100.");
    isValid = false;
  } else {
    clearFieldError(yearInput, yearError);
  }

  return isValid;
}

function resetForm() {
  itemIdInput.value = "";
  form.reset();
  clearFieldError(nameInput, nameError);
  clearFieldError(categoryInput, categoryError);
  clearFieldError(yearInput, yearError);
  submitBtn.textContent = "Agregar elemento";
  cancelEditBtn.hidden = true;
}

function getVisibleItems() {
  const filtered = items.filter((item) => {
    const searchValue = normalizeText(state.search);
    const inSearch =
      !searchValue ||
      normalizeText(item.name).includes(searchValue) ||
      normalizeText(item.category).includes(searchValue);

    const inCategory = state.category === "all" || item.category === state.category;

    return inSearch && inCategory;
  });

  filtered.sort((a, b) => {
    const field = state.sortField;
    const direction = state.sortDirection === "asc" ? 1 : -1;

    if (field === "year") {
      return (a.year - b.year) * direction;
    }

    return a[field].localeCompare(b[field], "es", { sensitivity: "base" }) * direction;
  });

  return filtered;
}

function renderCategoryFilter() {
  const currentValue = categoryFilter.value;
  const categories = [...new Set(items.map((item) => item.category))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );

  categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  if (categories.includes(currentValue)) {
    categoryFilter.value = currentValue;
  } else {
    state.category = "all";
    categoryFilter.value = "all";
  }
}

function renderTable() {
  const visibleItems = getVisibleItems();
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / state.pageSize));

  if (state.page > totalPages) {
    state.page = totalPages;
  }

  const start = (state.page - 1) * state.pageSize;
  const paginatedItems = visibleItems.slice(start, start + state.pageSize);

  tableBody.innerHTML = "";

  if (paginatedItems.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty";
    cell.textContent = "No hay elementos para mostrar.";
    row.appendChild(cell);
    tableBody.appendChild(row);
  } else {
    paginatedItems.forEach((item) => {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);

      row.querySelector('[data-col="name"]').textContent = item.name;
      row.querySelector('[data-col="category"]').textContent = item.category;
      row.querySelector('[data-col="year"]').textContent = item.year;

      const editBtn = row.querySelector(".edit");
      const deleteBtn = row.querySelector(".delete");

      editBtn.addEventListener("click", () => startEdit(item.id));
      deleteBtn.addEventListener("click", () => requestDelete(item.id));

      tableBody.appendChild(row);
    });
  }

  pageInfo.textContent = `Página ${state.page} de ${totalPages}`;
  prevPageBtn.disabled = state.page <= 1;
  nextPageBtn.disabled = state.page >= totalPages;
}

function requestDelete(id) {
  const item = items.find((entry) => entry.id === id);

  if (!item) {
    return;
  }

  pendingDeleteId = id;
  deleteModalText.textContent = `¿Seguro que quieres eliminar "${item.name}"?`;
  deleteModal.hidden = false;
  document.body.style.overflow = "hidden";
  confirmDeleteBtn.focus();
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.hidden = true;
  document.body.style.overflow = "";
}

function confirmDelete() {
  if (!pendingDeleteId) {
    closeDeleteModal();
    return;
  }

  deleteItem(pendingDeleteId);
  closeDeleteModal();
}

function refreshUI() {
  renderCategoryFilter();
  renderTable();
}

function createOrUpdateItem(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const year = Number.parseInt(yearInput.value, 10);

  const id = itemIdInput.value;

  if (id) {
    items = items.map((item) =>
      item.id === id ? { ...item, name, category, year } : item
    );
  } else {
    items.push({
      id: crypto.randomUUID(),
      name,
      category,
      year
    });
  }

  saveItems();
  state.page = 1;
  resetForm();
  refreshUI();
}

function startEdit(id) {
  const item = items.find((entry) => entry.id === id);

  if (!item) {
    return;
  }

  itemIdInput.value = item.id;
  nameInput.value = item.name;
  categoryInput.value = item.category;
  yearInput.value = item.year;
  submitBtn.textContent = "Guardar cambios";
  cancelEditBtn.hidden = false;
  nameInput.focus();
}

function deleteItem(id) {
  items = items.filter((item) => item.id !== id);
  saveItems();

  if (itemIdInput.value === id) {
    resetForm();
  }

  refreshUI();
}

function toggleSortDirection() {
  state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
  sortDirectionBtn.textContent = state.sortDirection === "asc" ? "Ascendente" : "Descendente";
  state.page = 1;
  renderTable();
}

function clearLiveErrors() {
  if (nameInput.value.trim()) {
    clearFieldError(nameInput, nameError);
  }

  if (categoryInput.value.trim()) {
    clearFieldError(categoryInput, categoryError);
  }

  if (yearInput.value.trim()) {
    clearFieldError(yearInput, yearError);
  }
}

form.addEventListener("submit", createOrUpdateItem);
cancelEditBtn.addEventListener("click", resetForm);
nameInput.addEventListener("input", clearLiveErrors);
categoryInput.addEventListener("input", clearLiveErrors);
yearInput.addEventListener("input", clearLiveErrors);

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  state.page = 1;
  renderTable();
});

categoryFilter.addEventListener("change", (event) => {
  state.category = event.target.value;
  state.page = 1;
  renderTable();
});

sortField.addEventListener("change", (event) => {
  state.sortField = event.target.value;
  state.page = 1;
  renderTable();
});

pageSizeSelect.addEventListener("change", (event) => {
  const nextSize = Number.parseInt(event.target.value, 10);

  if (!Number.isNaN(nextSize) && nextSize > 0) {
    state.pageSize = nextSize;
    state.page = 1;
  }

  renderTable();
});

prevPageBtn.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    renderTable();
  }
});

nextPageBtn.addEventListener("click", () => {
  state.page += 1;
  renderTable();
});

sortDirectionBtn.addEventListener("click", toggleSortDirection);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);
confirmDeleteBtn.addEventListener("click", confirmDelete);

deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) {
    closeDeleteModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !deleteModal.hidden) {
    closeDeleteModal();
  }
});

refreshUI();
