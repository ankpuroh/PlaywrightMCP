const state = {
  metadata: null,
  dataFiles: [],
  selectedDataCategory: "common",
  selectedDataFilePath: null,
  pageObjects: {},
  pageObjectsRelativePath: null,
  selectedLocatorPage: null,
};

const elements = {
  connectionBadge: document.getElementById("connectionBadge"),
  statusText: document.getElementById("statusText"),
  testTab: document.getElementById("testTab"),
  dataTab: document.getElementById("dataTab"),
  locatorsTab: document.getElementById("locatorsTab"),
  testTabButton: document.getElementById("testTabButton"),
  dataTabButton: document.getElementById("dataTabButton"),
  locatorsTabButton: document.getElementById("locatorsTabButton"),
  suiteName: document.getElementById("suiteName"),
  suiteDataset: document.getElementById("suiteDataset"),
  suiteDatasetCommon: document.getElementById("suiteDatasetCommon"),
  suiteDatasetDomain: document.getElementById("suiteDatasetDomain"),
  testcaseTableBody: document.getElementById("testcaseTableBody"),
  addTestcaseButton: document.getElementById("addTestcaseButton"),
  saveMetadataButton: document.getElementById("saveMetadataButton"),
  reloadMetadataButton: document.getElementById("reloadMetadataButton"),
  reloadDataButton: document.getElementById("reloadDataButton"),
  saveCurrentDataButton: document.getElementById("saveCurrentDataButton"),
  saveAllDataButton: document.getElementById("saveAllDataButton"),
  reloadLocatorsButton: document.getElementById("reloadLocatorsButton"),
  addLocatorPageButton: document.getElementById("addLocatorPageButton"),
  saveLocatorsButton: document.getElementById("saveLocatorsButton"),
  dataCategoryNav: document.getElementById("dataCategoryNav"),
  dataFileNav: document.getElementById("dataFileNav"),
  dataEditorPanel: document.getElementById("dataEditorPanel"),
  locatorPageNav: document.getElementById("locatorPageNav"),
  locatorEditorPanel: document.getElementById("locatorEditorPanel"),
  testcaseRowTemplate: document.getElementById("testcaseRowTemplate"),
  fieldRowTemplate: document.getElementById("fieldRowTemplate"),
  locatorRowTemplate: document.getElementById("locatorRowTemplate"),
};

const tabNames = ["test", "data", "locators"];

const categoryMeta = {
  common: { label: "Commons", description: "Shared execution and environment data" },
  domain: { label: "Domain", description: "Application or feature-level defaults" },
  test: { label: "Tests", description: "Scenario-specific data files" },
};

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.connectionBadge.textContent = isError ? "Attention" : "Connected";
  elements.connectionBadge.className = isError ? "badge validation-pill invalid" : "badge badge-live";
}

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalField(value) {
  const trimmed = cleanValue(value);
  return trimmed ? trimmed : undefined;
}

function splitCsv(value) {
  return cleanValue(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function classifyDataFile(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.startsWith("common")) return "common";
  if (lower.startsWith("domain")) return "domain";
  return "test";
}

function detectValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value) || isObject(value)) return "json";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function serializeDisplayValue(value, type) {
  if (type === "json") return JSON.stringify(value);
  if (type === "null") return "";
  return String(value ?? "");
}

function parseFieldValue(type, rawValue) {
  if (type === "string") return rawValue;
  if (type === "number") {
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid number value: ${rawValue}`);
    }
    return parsed;
  }
  if (type === "boolean") {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      throw new Error(`Boolean value must be true or false: ${rawValue}`);
    }
    return normalized === "true";
  }
  if (type === "null") return null;
  return JSON.parse(rawValue);
}

function normalizeEditableFile(content) {
  const structured = isObject(content) && (content.defaults !== undefined || content.datasets !== undefined);
  const defaults = structured ? (isObject(content.defaults) ? cloneValue(content.defaults) : {}) : cloneValue(content);
  const datasets = structured && isObject(content.datasets) ? cloneValue(content.datasets) : {};

  return {
    preserveStructured: structured,
    defaults: isObject(defaults) ? defaults : {},
    datasets: isObject(datasets) ? datasets : {},
  };
}

function serializeEditableFile(editorModel) {
  const datasetKeys = Object.keys(editorModel.datasets || {});
  if (!editorModel.preserveStructured && datasetKeys.length === 0) {
    return editorModel.defaults;
  }

  const payload = { defaults: editorModel.defaults };
  if (datasetKeys.length > 0) {
    payload.datasets = editorModel.datasets;
  }
  return payload;
}

function getVisibleDataFiles(category = state.selectedDataCategory) {
  return state.dataFiles.filter((file) => file.category === category);
}

function getLocatorPageNames() {
  return Object.keys(state.pageObjects).sort((left, right) => left.localeCompare(right));
}

function getSelectedLocatorPageObject() {
  return state.selectedLocatorPage ? state.pageObjects[state.selectedLocatorPage] || null : null;
}

function getSelectedDataFile() {
  return state.dataFiles.find((file) => file.relativePath === state.selectedDataFilePath) || null;
}

function showTab(tabName) {
  for (const name of tabNames) {
    elements[`${name}Tab`].classList.toggle("is-active", name === tabName);
    elements[`${name}TabButton`].classList.toggle("is-active", name === tabName);
  }
}

function createTestcaseRow(testcase = {}) {
  const fragment = elements.testcaseRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector("tr");

  row.querySelector('[data-field="id"]').value = testcase.id || "";
  row.querySelector('[data-field="file"]').value = testcase.file || "";
  row.querySelector('[data-field="tags"]').value = Array.isArray(testcase.tags) ? testcase.tags.join(", ") : "";
  row.querySelector('[data-field="dataCommon"]').value = testcase.dataCommon || "";
  row.querySelector('[data-field="datasetCommon"]').value = testcase.datasetCommon || "";
  row.querySelector('[data-field="dataDomain"]').value = testcase.dataDomain || "";
  row.querySelector('[data-field="datasetDomain"]').value = testcase.datasetDomain || "";
  row.querySelector('[data-field="data"]').value = testcase.data || "";
  row.querySelector('[data-field="dataset"]').value = testcase.dataset || "";

  row.querySelector('[data-action="remove"]').addEventListener("click", () => {
    row.remove();
  });

  elements.testcaseTableBody.appendChild(fragment);
}

function renderMetadata(content) {
  state.metadata = content;
  elements.suiteName.value = content.name || "";
  elements.suiteDataset.value = content.dataset || "";
  elements.suiteDatasetCommon.value = content.datasetCommon || "";
  elements.suiteDatasetDomain.value = content.datasetDomain || "";
  elements.testcaseTableBody.innerHTML = "";
  (content.testcases || []).forEach((testcase) => createTestcaseRow(testcase));
}

function normalizePageObjects(content) {
  if (!isObject(content)) return {};

  const pages = {};
  for (const [pageName, value] of Object.entries(content)) {
    if (!isObject(value)) continue;
    pages[pageName] = {};
    for (const [elementName, locator] of Object.entries(value)) {
      pages[pageName][elementName] = String(locator ?? "");
    }
  }

  return pages;
}

function collectMetadata() {
  const testcases = Array.from(elements.testcaseTableBody.querySelectorAll("tr")).map((row) => {
    const testcase = {
      id: cleanValue(row.querySelector('[data-field="id"]').value),
      file: cleanValue(row.querySelector('[data-field="file"]').value),
      tags: splitCsv(row.querySelector('[data-field="tags"]').value),
      dataCommon: optionalField(row.querySelector('[data-field="dataCommon"]').value),
      datasetCommon: optionalField(row.querySelector('[data-field="datasetCommon"]').value),
      dataDomain: optionalField(row.querySelector('[data-field="dataDomain"]').value),
      datasetDomain: optionalField(row.querySelector('[data-field="datasetDomain"]').value),
      data: optionalField(row.querySelector('[data-field="data"]').value),
      dataset: optionalField(row.querySelector('[data-field="dataset"]').value),
    };

    if (!testcase.id || !testcase.file) {
      throw new Error("Each testcase must include both id and file.");
    }

    return Object.fromEntries(
      Object.entries(testcase).filter(([key, value]) => {
        if (key === "tags") {
          return Array.isArray(value) && value.length > 0;
        }
        return value !== undefined && value !== "";
      })
    );
  });

  const payload = {
    name: cleanValue(elements.suiteName.value) || undefined,
    dataset: optionalField(elements.suiteDataset.value),
    datasetCommon: optionalField(elements.suiteDatasetCommon.value),
    datasetDomain: optionalField(elements.suiteDatasetDomain.value),
    testcases,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      if (key === "testcases") {
        return true;
      }
      return value !== undefined && value !== "";
    })
  );
}

function updateValidationState(card, isValid, message) {
  const pill = card.querySelector('[data-role="validation"]');
  pill.textContent = message;
  pill.className = `validation-pill ${isValid ? "valid" : "invalid"}`;
}

function createFieldRow(key = "", value = "") {
  const fragment = elements.fieldRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".field-row");
  const type = detectValueType(value);
  row.querySelector('[data-role="key"]').value = key;
  row.querySelector('[data-role="type"]').value = type;
  row.querySelector('[data-role="value"]').value = serializeDisplayValue(value, type);
  row.querySelector('[data-role="remove"]').addEventListener("click", () => row.remove());
  return row;
}

function createFieldList(fields) {
  const list = document.createElement("div");
  list.className = "field-list";

  Object.entries(fields || {}).forEach(([key, value]) => {
    list.appendChild(createFieldRow(key, value));
  });

  return list;
}

function buildSectionCard(title, subtitle, fields) {
  const section = document.createElement("section");
  section.className = "editor-section";

  const head = document.createElement("div");
  head.className = "section-head";

  const copy = document.createElement("div");
  const heading = document.createElement("h4");
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = subtitle;
  copy.append(heading, description);

  const addButton = document.createElement("button");
  addButton.className = "button button-secondary button-compact";
  addButton.textContent = "Add Field";

  const list = createFieldList(fields);
  addButton.addEventListener("click", () => {
    list.appendChild(createFieldRow());
  });

  head.append(copy, addButton);
  section.append(head, list);
  return section;
}

function buildDatasetCard(datasetName, fields) {
  const card = document.createElement("article");
  card.className = "dataset-card";
  card.dataset.datasetName = datasetName;

  const head = document.createElement("div");
  head.className = "dataset-head";

  const copy = document.createElement("div");
  const heading = document.createElement("h5");
  heading.textContent = datasetName;
  const description = document.createElement("p");
  description.textContent = "Overrides applied when this dataset is selected.";
  copy.append(heading, description);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const addButton = document.createElement("button");
  addButton.className = "button button-secondary button-compact";
  addButton.textContent = "Add Field";

  const removeButton = document.createElement("button");
  removeButton.className = "button button-danger button-compact";
  removeButton.textContent = "Remove Dataset";

  const list = createFieldList(fields);
  addButton.addEventListener("click", () => {
    list.appendChild(createFieldRow());
  });
  removeButton.addEventListener("click", () => card.remove());
  actions.append(addButton, removeButton);
  head.append(copy, actions);
  card.append(head, list);
  return card;
}

function readFieldList(container) {
  const result = {};
  const rows = Array.from(container.querySelectorAll(":scope > .field-row"));

  for (const row of rows) {
    const key = cleanValue(row.querySelector('[data-role="key"]').value);
    const type = row.querySelector('[data-role="type"]').value;
    const rawValue = row.querySelector('[data-role="value"]').value;

    if (!key) {
      if (!cleanValue(rawValue)) {
        continue;
      }
      throw new Error("Field key cannot be empty when a value is provided.");
    }

    result[key] = parseFieldValue(type, rawValue);
  }

  return result;
}

function syncSelectedDataFileFromEditor() {
  const file = getSelectedDataFile();
  if (!file) return;

  const defaultsContainer = elements.dataEditorPanel.querySelector('[data-role="defaults-list"]');
  if (!defaultsContainer) return;

  const datasetsContainer = elements.dataEditorPanel.querySelector('[data-role="datasets-container"]');
  const defaults = readFieldList(defaultsContainer);
  const datasets = {};

  if (datasetsContainer) {
    const datasetCards = Array.from(datasetsContainer.querySelectorAll(":scope > .dataset-card"));
    for (const card of datasetCards) {
      const datasetName = cleanValue(card.dataset.datasetName);
      if (!datasetName) {
        throw new Error("Dataset name cannot be empty.");
      }
      const list = card.querySelector(":scope > .field-list");
      datasets[datasetName] = readFieldList(list);
    }
  }

  file.editorModel.defaults = defaults;
  file.editorModel.datasets = datasets;
}

function renderDataCategoryNav() {
  elements.dataCategoryNav.innerHTML = "";
  const label = document.createElement("p");
  label.className = "nav-label";
  label.textContent = "Categories";
  elements.dataCategoryNav.appendChild(label);

  Object.entries(categoryMeta).forEach(([key, meta]) => {
    const count = state.dataFiles.filter((file) => file.category === key).length;
    const button = document.createElement("button");
    button.className = `nav-button${state.selectedDataCategory === key ? " is-active" : ""}`;
    button.innerHTML = `<span class="nav-button-title">${meta.label}</span><span class="nav-button-meta">${count} file${count === 1 ? "" : "s"}</span>`;
    button.addEventListener("click", () => {
      try {
        syncSelectedDataFileFromEditor();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to read data fields", true);
        return;
      }

      state.selectedDataCategory = key;
      const visible = getVisibleDataFiles(key);
      state.selectedDataFilePath = visible[0] ? visible[0].relativePath : null;
      renderDataNavigationAndEditor();
    });
    elements.dataCategoryNav.appendChild(button);
  });
}

function renderDataFileNav() {
  elements.dataFileNav.innerHTML = "";
  const label = document.createElement("p");
  label.className = "nav-label";
  label.textContent = categoryMeta[state.selectedDataCategory].label;
  elements.dataFileNav.appendChild(label);

  const files = getVisibleDataFiles();
  if (files.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p>No files in this category.</p>";
    elements.dataFileNav.appendChild(empty);
    return;
  }

  files.forEach((file) => {
    const button = document.createElement("button");
    button.className = `file-button${state.selectedDataFilePath === file.relativePath ? " is-active" : ""}`;
    button.innerHTML = `<span class="file-button-title">${file.name}</span><span class="file-button-meta">${file.relativePath}</span>`;
    button.addEventListener("click", () => {
      try {
        syncSelectedDataFileFromEditor();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to read data fields", true);
        return;
      }

      state.selectedDataFilePath = file.relativePath;
      renderDataNavigationAndEditor();
    });
    elements.dataFileNav.appendChild(button);
  });
}

function renderSelectedDataEditor() {
  const file = getSelectedDataFile();
  elements.dataEditorPanel.innerHTML = "";

  if (!file) {
    const empty = document.createElement("div");
    empty.className = "editor-placeholder";
    empty.textContent = "Choose a data file from the left to begin editing.";
    elements.dataEditorPanel.appendChild(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "editor-header";
  header.innerHTML = `
    <div class="editor-copy">
      <h3>${file.name}</h3>
      <p>${categoryMeta[file.category].description}</p>
      <span class="editor-meta">${file.relativePath}</span>
    </div>
    <span class="validation-pill valid">Structured Fields</span>
  `;

  const body = document.createElement("div");
  body.className = "editor-body";

  const defaultsSection = buildSectionCard(
    "Defaults",
    "Values loaded when no dataset-specific override is selected.",
    file.editorModel.defaults
  );
  defaultsSection.querySelector(".field-list").dataset.role = "defaults-list";

  const datasetsSection = document.createElement("section");
  datasetsSection.className = "editor-section";
  const datasetsHead = document.createElement("div");
  datasetsHead.className = "section-head";
  datasetsHead.innerHTML = `
    <div>
      <h4>Datasets</h4>
      <p>Named override sets, such as qa, staging, or negative.</p>
    </div>
  `;

  const addDatasetButton = document.createElement("button");
  addDatasetButton.className = "button button-secondary button-compact";
  addDatasetButton.textContent = "Add Dataset";
  datasetsHead.appendChild(addDatasetButton);

  const datasetsContainer = document.createElement("div");
  datasetsContainer.className = "dataset-list";
  datasetsContainer.dataset.role = "datasets-container";

  Object.entries(file.editorModel.datasets).forEach(([datasetName, fields]) => {
    datasetsContainer.appendChild(buildDatasetCard(datasetName, fields));
  });

  addDatasetButton.addEventListener("click", () => {
    const datasetName = window.prompt("Enter dataset name", "new-dataset");
    if (!datasetName || !datasetName.trim()) return;
    const normalizedName = datasetName.trim();
    const existing = Array.from(datasetsContainer.querySelectorAll(":scope > .dataset-card")).some(
      (card) => cleanValue(card.dataset.datasetName) === normalizedName
    );
    if (existing) {
      setStatus(`Dataset '${normalizedName}' already exists in ${file.name}.`, true);
      return;
    }
    datasetsContainer.appendChild(buildDatasetCard(normalizedName, {}));
  });

  if (Object.keys(file.editorModel.datasets).length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = "<p>No datasets yet. Add one if you need environment or scenario-specific overrides.</p>";
    datasetsContainer.appendChild(emptyState);
  }

  datasetsSection.append(datasetsHead, datasetsContainer);
  body.append(defaultsSection, datasetsSection);
  elements.dataEditorPanel.append(header, body);
}

function renderDataNavigationAndEditor() {
  const visible = getVisibleDataFiles();
  if (!visible.some((file) => file.relativePath === state.selectedDataFilePath)) {
    state.selectedDataFilePath = visible[0] ? visible[0].relativePath : null;
  }
  renderDataCategoryNav();
  renderDataFileNav();
  renderSelectedDataEditor();
}

function renderDataFiles(files) {
  state.dataFiles = files.map((file) => ({
    ...file,
    category: classifyDataFile(file.name),
    editorModel: normalizeEditableFile(file.content),
  }));

  const visible = getVisibleDataFiles(state.selectedDataCategory);
  if (!visible.length) {
    const firstCategory = Object.keys(categoryMeta).find((key) => getVisibleDataFiles(key).length > 0) || "common";
    state.selectedDataCategory = firstCategory;
  }

  const selected = getSelectedDataFile();
  if (!selected) {
    const nextVisible = getVisibleDataFiles(state.selectedDataCategory);
    state.selectedDataFilePath = nextVisible[0] ? nextVisible[0].relativePath : null;
  }

  renderDataNavigationAndEditor();
}

function createLocatorRow(elementName = "", locator = "") {
  const fragment = elements.locatorRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".locator-row");
  row.querySelector('[data-role="element"]').value = elementName;
  row.querySelector('[data-role="locator"]').value = locator;
  row.querySelector('[data-role="remove"]').addEventListener("click", () => row.remove());
  return row;
}

function readLocatorRows(container) {
  const result = {};
  const rows = Array.from(container.querySelectorAll(":scope > .locator-row"));

  for (const row of rows) {
    const elementName = cleanValue(row.querySelector('[data-role="element"]').value);
    const locator = cleanValue(row.querySelector('[data-role="locator"]').value);

    if (!elementName) {
      if (!locator) continue;
      throw new Error("Element name cannot be empty when a locator is provided.");
    }

    if (!locator) {
      throw new Error(`Locator cannot be empty for element '${elementName}'.`);
    }

    result[elementName] = locator;
  }

  return result;
}

function syncSelectedLocatorPageFromEditor() {
  if (!state.selectedLocatorPage) return;
  const container = elements.locatorEditorPanel.querySelector('[data-role="locator-list"]');
  if (!container) return;
  state.pageObjects[state.selectedLocatorPage] = readLocatorRows(container);
}

function renderLocatorPageNav() {
  elements.locatorPageNav.innerHTML = "";

  const label = document.createElement("p");
  label.className = "nav-label";
  label.textContent = "Pages";
  elements.locatorPageNav.appendChild(label);

  const pageNames = getLocatorPageNames();
  if (pageNames.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p>No page objects found. Add a page to start editing locators.</p>";
    elements.locatorPageNav.appendChild(empty);
    return;
  }

  for (const pageName of pageNames) {
    const button = document.createElement("button");
    button.className = `file-button${state.selectedLocatorPage === pageName ? " is-active" : ""}`;
    const elementCount = Object.keys(state.pageObjects[pageName] || {}).length;
    button.innerHTML = `<span class="file-button-title">${pageName}</span><span class="file-button-meta">${elementCount} element${elementCount === 1 ? "" : "s"}</span>`;
    button.addEventListener("click", () => {
      try {
        syncSelectedLocatorPageFromEditor();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to read locator fields", true);
        return;
      }

      state.selectedLocatorPage = pageName;
      renderLocatorEditor();
    });
    elements.locatorPageNav.appendChild(button);
  }
}

function renderSelectedLocatorPageEditor() {
  elements.locatorEditorPanel.innerHTML = "";
  const pageName = state.selectedLocatorPage;
  const pageObject = getSelectedLocatorPageObject();

  if (!pageName || !pageObject) {
    const empty = document.createElement("div");
    empty.className = "editor-placeholder";
    empty.textContent = "Choose a page from the left to edit its locator mappings.";
    elements.locatorEditorPanel.appendChild(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "locator-editor-head";
  header.innerHTML = `
    <div>
      <h4>${pageName}</h4>
      <p>Edit element names and locator values for this page object.</p>
      <span class="editor-meta">${state.pageObjectsRelativePath || "config/locators/pageObjects.json"}</span>
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const addButton = document.createElement("button");
  addButton.className = "button button-secondary button-compact";
  addButton.textContent = "Add Element";

  const deleteButton = document.createElement("button");
  deleteButton.className = "button button-danger button-compact";
  deleteButton.textContent = "Delete Page";

  const list = document.createElement("div");
  list.className = "field-list";
  list.dataset.role = "locator-list";

  Object.entries(pageObject).forEach(([elementName, locator]) => {
    list.appendChild(createLocatorRow(elementName, locator));
  });

  if (Object.keys(pageObject).length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = "<p>No elements on this page yet. Add one to start defining locators.</p>";
    list.appendChild(emptyState);
  }

  addButton.addEventListener("click", () => {
    const emptyState = list.querySelector(":scope > .empty-state");
    if (emptyState) emptyState.remove();
    list.appendChild(createLocatorRow());
  });

  deleteButton.addEventListener("click", () => {
    const confirmed = window.confirm(`Delete page '${pageName}' from pageObjects.json?`);
    if (!confirmed) return;
    delete state.pageObjects[pageName];
    const remainingPages = getLocatorPageNames();
    state.selectedLocatorPage = remainingPages[0] || null;
    renderLocatorEditor();
    setStatus(`Removed page '${pageName}'. Save to persist changes.`);
  });

  actions.append(addButton, deleteButton);
  header.appendChild(actions);

  elements.locatorEditorPanel.append(header, list);
}

function renderLocatorEditor() {
  const pageNames = getLocatorPageNames();
  if (!pageNames.includes(state.selectedLocatorPage)) {
    state.selectedLocatorPage = pageNames[0] || null;
  }
  renderLocatorPageNav();
  renderSelectedLocatorPageEditor();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

async function loadMetadata() {
  const data = await requestJson("/api/test-metadata");
  renderMetadata(data.content);
}

async function loadDataFiles() {
  const data = await requestJson("/api/data-files");
  renderDataFiles(data.files);
}

async function loadPageObjects() {
  const data = await requestJson("/api/page-objects");
  state.pageObjects = normalizePageObjects(data.content);
  state.pageObjectsRelativePath = data.relativePath;
  const pageNames = getLocatorPageNames();
  if (!pageNames.includes(state.selectedLocatorPage)) {
    state.selectedLocatorPage = pageNames[0] || null;
  }
  renderLocatorEditor();
}

async function saveMetadata() {
  const payload = collectMetadata();
  await requestJson("/api/test-metadata", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  setStatus("Saved TestMetaData.json");
}

async function saveDataFile(relativePath, content, label) {
  await requestJson("/api/data-files", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ relativePath, content }),
  });
  setStatus(`Saved ${label}`);
}

async function saveCurrentDataFile() {
  syncSelectedDataFileFromEditor();
  const file = getSelectedDataFile();
  if (!file) {
    throw new Error("No data file selected.");
  }

  const payload = serializeEditableFile(file.editorModel);
  await saveDataFile(file.relativePath, payload, file.name);
}

async function saveAllDataFiles() {
  syncSelectedDataFileFromEditor();
  for (const file of state.dataFiles) {
    const payload = serializeEditableFile(file.editorModel);
    await saveDataFile(file.relativePath, payload, file.name);
  }

  setStatus("Saved all data files");
}

async function savePageObjects() {
  syncSelectedLocatorPageFromEditor();
  await requestJson("/api/page-objects", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.pageObjects),
  });
  setStatus("Saved pageObjects.json");
}

async function bootstrap() {
  try {
    await requestJson("/api/health");
    await Promise.all([loadMetadata(), loadDataFiles(), loadPageObjects()]);
    setStatus("Editor ready");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to load editor", true);
  }
}

elements.testTabButton.addEventListener("click", () => showTab("test"));
elements.dataTabButton.addEventListener("click", () => showTab("data"));
elements.locatorsTabButton.addEventListener("click", () => showTab("locators"));
elements.addTestcaseButton.addEventListener("click", () => createTestcaseRow());
elements.saveMetadataButton.addEventListener("click", async () => {
  try {
    await saveMetadata();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to save metadata", true);
  }
});
elements.reloadMetadataButton.addEventListener("click", async () => {
  try {
    await loadMetadata();
    setStatus("Reloaded TestMetaData.json");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to reload metadata", true);
  }
});
elements.reloadDataButton.addEventListener("click", async () => {
  try {
    await loadDataFiles();
    setStatus("Reloaded data files");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to reload data files", true);
  }
});
elements.saveCurrentDataButton.addEventListener("click", async () => {
  try {
    await saveCurrentDataFile();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to save current data file", true);
  }
});
elements.saveAllDataButton.addEventListener("click", async () => {
  try {
    await saveAllDataFiles();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to save data files", true);
  }
});
elements.reloadLocatorsButton.addEventListener("click", async () => {
  try {
    await loadPageObjects();
    setStatus("Reloaded pageObjects.json");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to reload locators", true);
  }
});
elements.addLocatorPageButton.addEventListener("click", () => {
  const pageName = window.prompt("Enter page object name", "NewPage");
  if (!pageName || !pageName.trim()) return;
  const normalized = pageName.trim();
  if (state.pageObjects[normalized]) {
    setStatus(`Page '${normalized}' already exists.`, true);
    return;
  }
  state.pageObjects[normalized] = {};
  state.selectedLocatorPage = normalized;
  renderLocatorEditor();
  setStatus(`Added page '${normalized}'. Save to persist changes.`);
});
elements.saveLocatorsButton.addEventListener("click", async () => {
  try {
    await savePageObjects();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to save locators", true);
  }
});

bootstrap();