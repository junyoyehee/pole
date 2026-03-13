import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: FigmaNode[];
}

interface LayerInfo {
  nodeId: string;
  name: string;
  type: string;
  hidden: boolean;
  depth: number;
  fileName: string;
  downloadUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function safeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .toLowerCase()
    .substring(0, 60);
}

/** Collect direct children as layers (1 level for gallery, recurse for tree display) */
function collectLayers(node: FigmaNode, depth: number, maxDepth: number, rootX: number, rootY: number): LayerInfo[] {
  const layers: LayerInfo[] = [];
  if (depth > maxDepth) return layers;

  const bbox = node.absoluteBoundingBox;
  if (!bbox || bbox.width < 2 || bbox.height < 2) return layers;

  layers.push({
    nodeId: node.id,
    name: node.name,
    type: node.type,
    hidden: node.visible === false,
    depth,
    fileName: `${safeFileName(node.name)}_${node.id.replace(":", "-")}.png`,
    downloadUrl: "",
    x: Math.round(bbox.x - rootX),
    y: Math.round(bbox.y - rootY),
    width: Math.round(bbox.width),
    height: Math.round(bbox.height),
  });

  if (node.children) {
    for (const child of node.children) {
      layers.push(...collectLayers(child, depth + 1, maxDepth, rootX, rootY));
    }
  }

  return layers;
}

function generateHTML(
  designName: string,
  nodeName: string,
  canvasWidth: number,
  canvasHeight: number,
  fullImageFile: string,
  layers: LayerInfo[],
  fileKey: string,
  frameNodeId: string,
): string {
  const visibleLayers = layers.filter((l) => !l.hidden);
  const hiddenLayers = layers.filter((l) => l.hidden);
  const depth0Layers = layers.filter((l) => l.depth === 0);

  // Determine which layers have children (next item has greater depth)
  const hasChildren = layers.map((l, i) => {
    return i < layers.length - 1 && layers[i + 1].depth > l.depth;
  });

  const layerListHTML = layers
    .map((l, i) => {
      const indent = l.depth * 16;
      const hiddenBadge = l.hidden ? `<span class="badge badge--hidden">숨김</span>` : "";
      const eyeIcon = l.hidden ? "🔲" : "✅";
      const toggleBtn = hasChildren[i]
        ? `<button class="layer-toggle" data-index="${i}" title="접기/펼치기">▼</button>`
        : `<span class="layer-toggle-spacer"></span>`;
      return `        <div class="layer-item${l.hidden ? " layer-item--hidden" : ""}${hasChildren[i] ? " layer-parent" : ""}" data-index="${i}" data-depth="${l.depth}" style="padding-left: ${indent + 8}px">
          ${toggleBtn}
          <button class="layer-eye" data-index="${i}" title="표시/숨기기">${eyeIcon}</button>
          <span class="layer-type">${l.type}</span>
          <span class="layer-name" title="${l.name}">${l.name}</span>
          ${hiddenBadge}
          <span class="layer-size">${l.width}×${l.height}</span>
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${designName} — ${nodeName}</title>
  <style>
    :root {
      --bg-dark: #0C0C0F;
      --bg-panel: #1A1A2E;
      --bg-item: #16213E;
      --bg-item-hover: #1E2D4F;
      --accent: #A78BFA;
      --accent-dim: rgba(167, 139, 250, 0.3);
      --text-primary: #E0E2EA;
      --text-secondary: #8B8FA3;
      --text-dim: #6B7080;
      --border: rgba(255, 255, 255, 0.08);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--bg-dark);
      color: var(--text-primary);
      font-family: 'Pretendard', -apple-system, sans-serif;
      font-size: 13px;
      overflow: hidden;
      height: 100vh;
    }

    /* ===== Layout ===== */
    .app { display: flex; height: 100vh; }
    .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    /* ===== Split View ===== */
    .split-view { flex: 1; display: flex; overflow: hidden; }
    .view-pane {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
    }
    .view-pane + .view-pane { border-left: 1px solid var(--border); }
    .view-pane img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    }
    .view-pane.single { flex: 1; }
    .view-pane.hidden-pane { display: none; }

    /* ===== Composite Canvas ===== */
    .composite-wrap {
      position: relative;
      border-radius: 4px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      background: repeating-conic-gradient(#2a2a3a 0% 25%, #1a1a2e 0% 50%) 0 0 / 16px 16px;
      transform-origin: center center;
    }
    .composite-wrap img {
      box-shadow: none;
      border-radius: 0;
    }
    .composite-full {
      display: block;
      width: 100%;
      height: 100%;
    }
    .composite-layer {
      position: absolute;
      pointer-events: none;
      transition: opacity 0.15s;
    }
    .composite-layer.layer-off { opacity: 0; }

    .pane-label {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-panel);
      border: 1px solid var(--border);
      padding: 4px 14px;
      border-radius: 6px;
      font-size: 11px;
      color: var(--text-secondary);
      z-index: 2;
      white-space: nowrap;
    }
    .pane-label .accent { color: var(--accent); font-weight: 600; }

    /* ===== Panel ===== */
    .panel {
      width: 300px;
      flex-shrink: 0;
      background: var(--bg-panel);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    .panel-header { padding: 12px 16px; border-bottom: 1px solid var(--border); }
    .panel-header h2 { font-size: 13px; font-weight: 600; color: var(--accent); margin-bottom: 2px; }
    .panel-header p { font-size: 10px; color: var(--text-dim); }

    .controls {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .ctrl-btn {
      padding: 4px 8px;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--bg-item);
      color: var(--text-primary);
      font-size: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ctrl-btn:hover { background: var(--bg-item-hover); border-color: var(--accent-dim); }
    .ctrl-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

    .panel-tabs { display: flex; border-bottom: 1px solid var(--border); }
    .panel-tab {
      flex: 1; padding: 8px; text-align: center; font-size: 11px; font-weight: 500;
      background: none; border: none; color: var(--text-secondary);
      cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s;
    }
    .panel-tab:hover { color: var(--text-primary); }
    .panel-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    .panel-content { flex: 1; overflow-y: auto; padding: 4px 0; }
    .panel-section { display: none; }
    .panel-section.active { display: block; }

    /* ===== Layer Items ===== */
    .layer-item {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 6px; cursor: pointer; border-radius: 4px;
      margin: 1px 6px; transition: background 0.15s;
    }
    .layer-item:hover { background: var(--bg-item-hover); }
    .layer-item.active { background: var(--accent-dim); }

    .layer-toggle {
      background: none; border: none; cursor: pointer;
      font-size: 8px; padding: 0; line-height: 1;
      flex-shrink: 0; width: 14px; text-align: center;
      color: var(--text-secondary); transition: transform 0.15s;
    }
    .layer-toggle:hover { color: var(--accent); }
    .layer-toggle.collapsed { transform: rotate(-90deg); }
    .layer-toggle-spacer { width: 14px; flex-shrink: 0; }
    .layer-item.layer-collapsed { display: none !important; }

    .layer-eye {
      background: none; border: none; cursor: pointer;
      font-size: 11px; padding: 0; line-height: 1;
      flex-shrink: 0; width: 16px; text-align: center;
    }
    .layer-eye:hover { transform: scale(1.2); }

    .layer-type {
      font-size: 8px; font-weight: 600; color: var(--accent);
      background: var(--accent-dim); padding: 1px 4px;
      border-radius: 3px; flex-shrink: 0; text-transform: uppercase;
    }
    .layer-name {
      flex: 1; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; font-size: 11px; cursor: pointer;
    }
    .layer-name:hover { text-decoration: underline; color: var(--accent); }
    .layer-size { font-size: 9px; color: var(--text-dim); flex-shrink: 0; }
    .badge { font-size: 8px; padding: 1px 4px; border-radius: 3px; flex-shrink: 0; }
    .badge--hidden { background: rgba(251, 191, 36, 0.2); color: #FBBF24; }

    .info-bar {
      padding: 10px 16px; border-top: 1px solid var(--border);
      background: var(--bg-item); font-size: 10px; color: var(--text-secondary);
    }
    .info-bar .stats { display: flex; gap: 12px; }
    .info-bar .stat-value { color: var(--accent); font-weight: 600; }

    /* ===== Zoom ===== */
    .zoom-controls {
      position: fixed; bottom: 12px; left: calc(50% - 150px); transform: translateX(-50%);
      display: flex; gap: 4px; background: var(--bg-panel);
      border: 1px solid var(--border); border-radius: 8px; padding: 4px; z-index: 10;
    }
    .zoom-btn {
      width: 28px; height: 28px; border: none; border-radius: 5px;
      background: none; color: var(--text-primary); cursor: pointer;
      font-size: 13px; display: flex; align-items: center; justify-content: center;
    }
    .zoom-btn:hover { background: var(--bg-item-hover); }
    .zoom-label {
      display: flex; align-items: center; padding: 0 6px;
      font-size: 11px; color: var(--text-secondary); min-width: 40px; justify-content: center;
    }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  </style>
</head>
<body>
  <div class="app">
    <div class="main-area">
      <div class="split-view">
        <!-- Left: Full Render with composited layers -->
        <div class="view-pane single" id="paneLeft">
          <div class="pane-label"><span class="accent" id="leftPaneLabel">전체 보기</span></div>
          <div class="composite-wrap" id="compositeWrap" style="width: ${canvasWidth}px; height: ${canvasHeight}px;">
            <img class="composite-full" id="mainImg" src="images/${fullImageFile}" alt="${nodeName}" />
            <img class="composite-full" id="apiRenderImg" src="" alt="" style="display:none; position:absolute; top:0; left:0;" />
${depth0Layers.map((l) => {
    const i = layers.indexOf(l);
    return `            <img class="composite-layer layer-off" data-layer="${i}" data-node-id="${l.nodeId}" src="images/${l.fileName}" style="left: ${(l.x / canvasWidth) * 100}%; top: ${(l.y / canvasHeight) * 100}%; width: ${(l.width / canvasWidth) * 100}%; height: ${(l.height / canvasHeight) * 100}%;" />`;
  }).join("\n")}
          </div>
        </div>
        <!-- Right: Selected Layer (hidden until layer clicked) -->
        <div class="view-pane hidden-pane" id="paneRight">
          <div class="pane-label"><span class="accent" id="layerPaneLabel">레이어</span></div>
          <img id="layerImg" src="" alt="" />
          <div class="composite-wrap" id="rightComposite" style="display:none;"></div>
        </div>
      </div>
    </div>

    <!-- Panel -->
    <div class="panel">
      <div class="panel-header">
        <h2>${nodeName}</h2>
        <p>${designName} — ${canvasWidth}×${canvasHeight}px</p>
      </div>

      <div class="controls">
        <button class="ctrl-btn" id="btnShowAll">전체 표시</button>
        <button class="ctrl-btn" id="btnHideAll">전체 숨기기</button>
        <button class="ctrl-btn" id="btnApplyHidden">숨겨진 레이어 적용</button>
        <button class="ctrl-btn" id="btnCollapseAll">전체 접기</button>
        <button class="ctrl-btn" id="btnExpandAll">전체 펼치기</button>
      </div>
      <div class="controls" style="border-bottom: 1px solid var(--border);">
        <span style="font-size:10px; color:var(--text-dim); line-height:24px;">합성 모드:</span>
        <button class="ctrl-btn active" id="modeLocal">로컬 합성</button>
        <button class="ctrl-btn" id="modeApi">API 재렌더</button>
        <button class="ctrl-btn" id="btnApiRender" style="display:none; background: var(--accent-dim); border-color: var(--accent); color: var(--accent);">재렌더 실행</button>
        <span id="apiStatus" style="font-size:9px; color:var(--text-dim); line-height:24px; display:none;"></span>
      </div>

      <div class="panel-tabs">
        <button class="panel-tab active" data-tab="all">전체 (${layers.length})</button>
        <button class="panel-tab" data-tab="visible">표시 (${visibleLayers.length})</button>
        <button class="panel-tab" data-tab="hidden">숨김 (${hiddenLayers.length})</button>
      </div>

      <div class="panel-content">
        <div class="panel-section active" data-section="all">
${layerListHTML}
        </div>
        <div class="panel-section" data-section="visible">
${visibleLayers.map((l) => {
    const i = layers.indexOf(l);
    return `          <div class="layer-item" data-index="${i}" style="padding-left: ${l.depth * 16 + 8}px">
            <button class="layer-eye" data-index="${i}">✅</button>
            <span class="layer-type">${l.type}</span>
            <span class="layer-name" title="${l.name}">${l.name}</span>
            <span class="layer-size">${l.width}×${l.height}</span>
          </div>`;
  }).join("\n")}
        </div>
        <div class="panel-section" data-section="hidden">
${hiddenLayers.length === 0
    ? `          <div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 11px;">숨긴 레이어가 없습니다</div>`
    : hiddenLayers.map((l) => {
        const i = layers.indexOf(l);
        return `          <div class="layer-item layer-item--hidden" data-index="${i}" style="padding-left: ${l.depth * 16 + 8}px">
            <button class="layer-eye" data-index="${i}">🔲</button>
            <span class="layer-type">${l.type}</span>
            <span class="layer-name" title="${l.name}">${l.name}</span>
            <span class="badge badge--hidden">숨김</span>
            <span class="layer-size">${l.width}×${l.height}</span>
          </div>`;
      }).join("\n")}
        </div>
      </div>

      <div class="info-bar">
        <div class="stats">
          <span>전체 <span class="stat-value">${layers.length}</span></span>
          <span>표시 <span class="stat-value">${visibleLayers.length}</span></span>
          <span>숨김 <span class="stat-value">${hiddenLayers.length}</span></span>
        </div>
      </div>
    </div>
  </div>

  <div class="zoom-controls">
    <button class="zoom-btn" id="zoomOut">−</button>
    <span class="zoom-label" id="zoomLabel">100%</span>
    <button class="zoom-btn" id="zoomIn">+</button>
    <button class="zoom-btn" id="zoomFit">⊡</button>
  </div>

  <script>
    const layers = ${JSON.stringify(layers.map((l, i) => ({
      name: l.name, type: l.type, hidden: l.hidden, depth: l.depth,
      nodeId: l.nodeId, x: l.x, y: l.y,
      width: l.width, height: l.height, file: "images/" + l.fileName,
      hasChildren: hasChildren[i],
    })))};
    const hiddenIndices = ${JSON.stringify(hiddenLayers.map((l) => layers.indexOf(l)))};
    const depth0Indices = ${JSON.stringify(depth0Layers.map((l) => layers.indexOf(l)))};
    const fileKey = ${JSON.stringify(fileKey)};
    const frameNodeId = ${JSON.stringify(frameNodeId)};

    const paneLeft = document.getElementById('paneLeft');
    const paneRight = document.getElementById('paneRight');
    const mainImg = document.getElementById('mainImg');
    const apiRenderImg = document.getElementById('apiRenderImg');
    const layerImg = document.getElementById('layerImg');
    const layerPaneLabel = document.getElementById('layerPaneLabel');
    const compositeWrap = document.getElementById('compositeWrap');
    const compositeLayers = compositeWrap.querySelectorAll('.composite-layer');
    const rightComposite = document.getElementById('rightComposite');

    const visible = layers.map(l => !l.hidden);
    let zoom = 1;
    let selectedIdx = -1;
    let hiddenApplied = false;
    let renderMode = 'local'; // 'local' (Method 2) or 'api' (Method 3)
    let apiBase = 'http://localhost:3000';
    let apiSnapshot = null; // { dataUrl, visible: [...] } — saved after API re-render

    function isAnyDepth0Toggled() {
      return depth0Indices.some(i => visible[i] !== !layers[i].hidden);
    }

    function isChangedFromSnapshot() {
      if (!apiSnapshot) return true;
      return depth0Indices.some(i => visible[i] !== apiSnapshot.visible[i]);
    }

    function getDirectChildren(parentIdx) {
      const parentDepth = layers[parentIdx].depth;
      const result = [];
      const range = getChildRange(parentIdx);
      for (let c = range.start; c < range.end; c++) {
        if (layers[c].depth === parentDepth + 1) result.push(c);
      }
      return result;
    }

    function syncUI() {
      // Sync panel layer list
      document.querySelectorAll('.layer-eye').forEach(btn => {
        const idx = parseInt(btn.dataset.index);
        btn.textContent = visible[idx] ? '✅' : '🔲';
      });
      document.querySelectorAll('.layer-item').forEach(item => {
        const idx = parseInt(item.dataset.index);
        if (isNaN(idx)) return;
        item.style.opacity = visible[idx] ? '1' : '0.4';
        item.classList.toggle('active', idx === selectedIdx);
      });

      // Sync right pane sub-layer composite
      document.querySelectorAll('.right-sub-layer').forEach(el => {
        const c = parseInt(el.dataset.subIdx);
        el.classList.toggle('layer-off', !visible[c]);
      });

      const toggled = isAnyDepth0Toggled();

      if (renderMode === 'local') {
        // Method 2: local composite with depth-0 layers only
        if (apiSnapshot && !isChangedFromSnapshot()) {
          // State matches API render snapshot — show API rendered image as base
          mainImg.style.display = 'none';
          apiRenderImg.src = apiSnapshot.dataUrl;
          apiRenderImg.style.display = 'block';
          compositeLayers.forEach(el => { el.style.display = 'none'; });
          document.getElementById('leftPaneLabel').innerHTML = '<span class="accent">API 렌더 기반</span>';
        } else if (toggled) {
          // depth-0 toggled beyond snapshot — local composite
          apiRenderImg.style.display = 'none';
          mainImg.style.display = 'none';
          compositeLayers.forEach(el => {
            const idx = parseInt(el.dataset.layer);
            el.style.display = 'block';
            el.classList.toggle('layer-off', !visible[idx]);
          });
          document.getElementById('leftPaneLabel').innerHTML = '<span class="accent">로컬 합성 (depth-0)</span>';
        } else {
          // No changes — original full render
          apiRenderImg.style.display = 'none';
          mainImg.style.display = 'block';
          compositeLayers.forEach(el => { el.style.display = 'none'; });
          document.getElementById('leftPaneLabel').innerHTML = '<span class="accent">전체 보기</span>';
        }
      } else {
        // Method 3: API re-render mode — keep full render until user clicks re-render
        compositeLayers.forEach(el => { el.style.display = 'none'; });
        if (apiRenderImg.src && apiRenderImg.dataset.loaded === '1') {
          mainImg.style.display = 'none';
          apiRenderImg.style.display = 'block';
          document.getElementById('leftPaneLabel').innerHTML = '<span class="accent">API 재렌더</span>';
        } else {
          mainImg.style.display = 'block';
          apiRenderImg.style.display = 'none';
          document.getElementById('leftPaneLabel').innerHTML = '<span class="accent">전체 보기</span>';
        }
      }
    }

    function showLayer(idx) {
      selectedIdx = idx;
      const layer = layers[idx];
      layerPaneLabel.textContent = layer.name + ' (' + layer.type + ' ' + layer.width + '×' + layer.height + ')';
      paneRight.classList.remove('hidden-pane');
      paneLeft.classList.remove('single');

      if (layer.hasChildren) {
        // Composite view: stack direct children
        layerImg.style.display = 'none';
        rightComposite.style.display = 'block';
        rightComposite.style.width = layer.width + 'px';
        rightComposite.style.height = layer.height + 'px';

        const children = getDirectChildren(idx);
        let html = '';
        for (const c of children) {
          const sub = layers[c];
          const left = ((sub.x - layer.x) / layer.width * 100);
          const top = ((sub.y - layer.y) / layer.height * 100);
          const w = (sub.width / layer.width * 100);
          const h = (sub.height / layer.height * 100);
          html += '<img class="composite-layer right-sub-layer' + (visible[c] ? '' : ' layer-off') + '" data-sub-idx="' + c + '" src="' + sub.file + '" style="left:' + left + '%;top:' + top + '%;width:' + w + '%;height:' + h + '%;" />';
        }
        rightComposite.innerHTML = html;
      } else {
        // Single layer image
        layerImg.style.display = 'block';
        layerImg.src = layer.file;
        layerImg.alt = layer.name;
        rightComposite.style.display = 'none';
      }

      syncUI();
    }

    function hideLayerPane() {
      selectedIdx = -1;
      paneRight.classList.add('hidden-pane');
      paneLeft.classList.add('single');
      rightComposite.style.display = 'none';
      rightComposite.innerHTML = '';
      layerImg.style.display = 'block';
      syncUI();
    }

    // Eye toggle — parent toggles all children too
    document.querySelectorAll('.layer-eye').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const newVal = !visible[idx];
        visible[idx] = newVal;
        // Cascade to children
        if (layers[idx].hasChildren) {
          const range = getChildRange(idx);
          for (let c = range.start; c < range.end; c++) {
            visible[c] = newVal;
          }
        }
        syncUI();
      });
    });

    // Click layer name → show in right pane
    document.querySelectorAll('.layer-name').forEach(nameEl => {
      nameEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = nameEl.closest('.layer-item');
        const idx = parseInt(item.dataset.index);
        if (idx === selectedIdx) {
          hideLayerPane();
        } else {
          showLayer(idx);
        }
      });
    });

    // Click layer item row (not eye or name) → also show
    document.querySelectorAll('.layer-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        if (idx === selectedIdx) {
          hideLayerPane();
        } else {
          showLayer(idx);
        }
      });
    });

    // Bulk controls
    document.getElementById('btnShowAll').addEventListener('click', () => {
      visible.fill(true);
      syncUI();
    });

    document.getElementById('btnHideAll').addEventListener('click', () => {
      visible.fill(false);
      syncUI();
    });

    // "숨겨진 레이어 적용" — show all hidden layers' images overlaid
    const btnApply = document.getElementById('btnApplyHidden');
    btnApply.addEventListener('click', () => {
      hiddenApplied = !hiddenApplied;
      btnApply.classList.toggle('active', hiddenApplied);
      btnApply.textContent = hiddenApplied ? '숨겨진 레이어 해제' : '숨겨진 레이어 적용';

      if (hiddenApplied) {
        // Show hidden layers: turn them all visible
        hiddenIndices.forEach(i => { visible[i] = true; });
      } else {
        // Restore hidden layers to hidden
        hiddenIndices.forEach(i => { visible[i] = false; });
      }
      syncUI();

      // If there are hidden layers and one is selected, show it
      if (hiddenApplied && hiddenIndices.length > 0 && selectedIdx === -1) {
        showLayer(hiddenIndices[0]);
      }
    });

    // Collapse/Expand tree
    const collapsed = new Set();

    function getChildRange(parentIdx) {
      const parentDepth = layers[parentIdx].depth;
      let end = parentIdx + 1;
      while (end < layers.length && layers[end].depth > parentDepth) end++;
      return { start: parentIdx + 1, end };
    }

    function syncCollapse() {
      // For each layer item in "all" section, determine if it should be hidden
      const allItems = document.querySelectorAll('[data-section="all"] .layer-item');
      allItems.forEach(item => {
        const idx = parseInt(item.dataset.index);
        if (isNaN(idx)) return;
        // Check if any ancestor is collapsed
        let hidden = false;
        for (const cIdx of collapsed) {
          const range = getChildRange(cIdx);
          if (idx >= range.start && idx < range.end) { hidden = true; break; }
        }
        item.classList.toggle('layer-collapsed', hidden);
      });

      // Update toggle arrows
      document.querySelectorAll('.layer-toggle[data-index]').forEach(btn => {
        const idx = parseInt(btn.dataset.index);
        btn.classList.toggle('collapsed', collapsed.has(idx));
        btn.textContent = collapsed.has(idx) ? '▶' : '▼';
      });
    }

    document.querySelectorAll('.layer-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        if (collapsed.has(idx)) {
          collapsed.delete(idx);
        } else {
          collapsed.add(idx);
        }
        syncCollapse();
      });
    });

    document.getElementById('btnCollapseAll').addEventListener('click', () => {
      layers.forEach((l, i) => { if (l.hasChildren) collapsed.add(i); });
      syncCollapse();
    });

    document.getElementById('btnExpandAll').addEventListener('click', () => {
      collapsed.clear();
      syncCollapse();
    });

    // Tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector('[data-section="' + tab.dataset.tab + '"]').classList.add('active');
      });
    });

    // Mode switching
    const modeLocal = document.getElementById('modeLocal');
    const modeApi = document.getElementById('modeApi');
    const btnApiRender = document.getElementById('btnApiRender');
    const apiStatus = document.getElementById('apiStatus');

    modeLocal.addEventListener('click', () => {
      renderMode = 'local';
      modeLocal.classList.add('active');
      modeApi.classList.remove('active');
      btnApiRender.style.display = 'none';
      apiStatus.style.display = apiSnapshot ? 'inline' : 'none';
      if (apiSnapshot) {
        apiStatus.textContent = 'API 렌더 기반 적용 중';
        apiStatus.style.color = '';
      }
      syncUI();
    });

    modeApi.addEventListener('click', () => {
      renderMode = 'api';
      modeApi.classList.add('active');
      modeLocal.classList.remove('active');
      btnApiRender.style.display = 'inline-block';
      apiStatus.style.display = 'inline';
      apiStatus.textContent = '토글 후 "재렌더 실행" 클릭';
      apiRenderImg.dataset.loaded = '0';
      syncUI();
    });

    btnApiRender.addEventListener('click', async () => {
      // Collect visible depth-0 node IDs
      const visibleNodeIds = depth0Indices
        .filter(i => visible[i])
        .map(i => layers[i].nodeId);

      if (visibleNodeIds.length === 0) {
        apiStatus.textContent = '표시할 레이어가 없습니다';
        return;
      }

      btnApiRender.disabled = true;
      apiStatus.textContent = '렌더링 중...';

      try {
        const res = await fetch(apiBase + '/api/figma/render-composite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey, nodeIds: visibleNodeIds }),
        });

        if (!res.ok) throw new Error('API 응답 오류: ' + res.status);
        const data = await res.json();
        const images = data.images || {};

        // Create composite canvas
        const canvas = document.createElement('canvas');
        canvas.width = ${canvasWidth} * 2; // scale 2
        canvas.height = ${canvasHeight} * 2;
        const ctx = canvas.getContext('2d');

        // Load and draw each visible depth-0 layer in order
        const sortedIds = visibleNodeIds;
        let loaded = 0;
        for (const nid of sortedIds) {
          const url = images[nid];
          if (!url) continue;
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = url;
            });
            // Find layer info for positioning
            const li = layers.find(l => l.nodeId === nid);
            if (!li) continue;
            const dx = (li.x || 0) / ${canvasWidth} * canvas.width;
            const dy = (li.y || 0) / ${canvasHeight} * canvas.height;
            const dw = li.width / ${canvasWidth} * canvas.width;
            const dh = li.height / ${canvasHeight} * canvas.height;
            ctx.drawImage(img, dx, dy, dw, dh);
            loaded++;
            apiStatus.textContent = '렌더링 중... ' + loaded + '/' + sortedIds.length;
          } catch(e) { /* skip failed */ }
        }

        const dataUrl = canvas.toDataURL('image/png');
        apiRenderImg.src = dataUrl;
        apiRenderImg.dataset.loaded = '1';
        apiSnapshot = { dataUrl, visible: [...visible] };
        apiStatus.textContent = '완료 (' + loaded + '개 레이어) — 로컬 합성에서도 사용 가능';
        syncUI();
      } catch(e) {
        apiStatus.textContent = '오류: ' + e.message;
        apiStatus.style.color = '#f87171';
      } finally {
        btnApiRender.disabled = false;
      }
    });

    // Zoom
    function setZoom(z) {
      zoom = Math.max(0.1, Math.min(5, z));
      compositeWrap.style.transform = 'scale(' + zoom + ')';
      layerImg.style.transform = 'scale(' + zoom + ')';
      rightComposite.style.transform = 'scale(' + zoom + ')';
      document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
    }
    document.getElementById('zoomIn').addEventListener('click', () => setZoom(zoom + 0.15));
    document.getElementById('zoomOut').addEventListener('click', () => setZoom(zoom - 0.15));
    document.getElementById('zoomFit').addEventListener('click', () => setZoom(1));
    document.querySelector('.split-view').addEventListener('wheel', (e) => {
      if (e.ctrlKey) { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 0.05 : -0.05)); }
    }, { passive: false });

    syncUI();
  </script>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileKey,
      nodes,
    }: {
      fileKey: string;
      nodes: Array<{ id: string; name: string; type: string }>;
    } = body;

    if (!fileKey || !nodes?.length) {
      return NextResponse.json({ error: "fileKey and nodes are required" }, { status: 400 });
    }

    if (!FIGMA_API_KEY) {
      return NextResponse.json({ error: "FIGMA_API_KEY is not configured" }, { status: 500 });
    }

    const results: Array<{
      nodeId: string;
      nodeName: string;
      folderName: string;
      htmlFileName: string;
      htmlContent: string;
      images: Array<{ nodeId: string; fileName: string; downloadUrl: string }>;
      status: "success" | "failed";
      error?: string;
    }> = [];

    for (const node of nodes) {
      try {
        const figmaNodeId = node.id.replace("-", ":");

        // 1. Fetch node structure
        const nodeRes = await fetch(
          `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${figmaNodeId}&depth=10`,
          { headers: { "X-Figma-Token": FIGMA_API_KEY } }
        );

        if (!nodeRes.ok) {
          results.push({
            nodeId: node.id, nodeName: node.name, folderName: "", htmlFileName: "",
            htmlContent: "", images: [], status: "failed",
            error: `Figma API error: ${nodeRes.status}`,
          });
          continue;
        }

        const nodeData = await nodeRes.json();
        const nodeKey = Object.keys(nodeData.nodes)[0];
        const figmaDoc: FigmaNode = nodeData.nodes[nodeKey]?.document;

        if (!figmaDoc?.absoluteBoundingBox) {
          results.push({
            nodeId: node.id, nodeName: node.name, folderName: "", htmlFileName: "",
            htmlContent: "", images: [], status: "failed",
            error: "Could not parse node data",
          });
          continue;
        }

        const rootBBox = figmaDoc.absoluteBoundingBox;

        // 2. Collect child layers (depth up to 3)
        const allLayers: LayerInfo[] = [];
        if (figmaDoc.children) {
          for (const child of figmaDoc.children) {
            allLayers.push(...collectLayers(child, 0, 3, rootBBox.x, rootBBox.y));
          }
        }

        // 3. Render the FULL frame as one image (this matches the preview exactly)
        const fullRenderFileName = `_full_${node.id.replace(":", "-")}.png`;
        let fullRenderUrl = "";

        const fullImgRes = await fetch(
          `${FIGMA_API_BASE}/images/${fileKey}?ids=${figmaNodeId}&format=png&scale=2`,
          { headers: { "X-Figma-Token": FIGMA_API_KEY } }
        );
        if (fullImgRes.ok) {
          const fullImgData = await fullImgRes.json();
          fullRenderUrl = fullImgData.images?.[figmaNodeId] || "";
        }

        if (!fullRenderUrl) {
          results.push({
            nodeId: node.id, nodeName: node.name, folderName: "", htmlFileName: "",
            htmlContent: "", images: [], status: "failed",
            error: "Could not render full frame image",
          });
          continue;
        }

        // 4. Render individual layers
        const layerIds = allLayers.map((l) => l.nodeId);
        if (layerIds.length > 0) {
          for (let i = 0; i < layerIds.length; i += 50) {
            const batch = layerIds.slice(i, i + 50);
            const ids = batch.join(",");
            const imgRes = await fetch(
              `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=png&scale=2`,
              { headers: { "X-Figma-Token": FIGMA_API_KEY } }
            );
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              const images: Record<string, string | null> = imgData.images || {};
              for (const layer of allLayers) {
                if (images[layer.nodeId]) {
                  layer.downloadUrl = images[layer.nodeId] as string;
                }
              }
            }
          }
        }

        // Filter layers that got renders
        const validLayers = allLayers.filter((l) => l.downloadUrl);

        // 5. Generate HTML
        const htmlContent = generateHTML(
          nodeData.name || "Untitled",
          figmaDoc.name,
          Math.round(rootBBox.width),
          Math.round(rootBBox.height),
          fullRenderFileName,
          validLayers,
          fileKey,
          figmaNodeId,
        );

        // 6. Build image list (full render + individual layers)
        const imageList = [
          { nodeId: figmaNodeId, fileName: fullRenderFileName, downloadUrl: fullRenderUrl },
          ...validLayers.map((l) => ({
            nodeId: l.nodeId,
            fileName: l.fileName,
            downloadUrl: l.downloadUrl,
          })),
        ];

        results.push({
          nodeId: node.id,
          nodeName: node.name,
          folderName: safeFileName(node.name),
          htmlFileName: "index.html",
          htmlContent,
          images: imageList,
          status: "success",
        });
      } catch (e) {
        results.push({
          nodeId: node.id, nodeName: node.name, folderName: "", htmlFileName: "",
          htmlContent: "", images: [], status: "failed",
          error: String(e),
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        successCount,
        failCount: results.length - successCount,
        results,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
