import { joinBasePath, localizedPath, resolveBasePath } from './lib/basePath.js'
import { releasesPageUrl, resolveReleaseState } from './lib/releaseData.js'
import { siteContent, supportedTargets, targetLabels } from './content/siteContent.js'

const page = document.documentElement.dataset.page || 'root'
const app = document.querySelector('#app')
const basePath = resolveBasePath()

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderLanguageSwitch(activeKey) {
  const links = [
    { key: 'zh', label: '中文', href: localizedPath(basePath, 'zh') },
    { key: 'en', label: 'English', href: localizedPath(basePath, 'en') },
  ]

  return `
    <nav class="language-switch" aria-label="Language switch">
      ${links.map((link) => `
        <a href="${link.href}" class="${link.key === activeKey ? 'active' : ''}">${link.label}</a>
      `).join('')}
    </nav>
  `
}

function renderBrandTagline() {
  return `
    <div class="brand">
      <div class="brand-mark">PN</div>
      <div class="brand-copy">
        <h1>Pyramid Notes</h1>
        <p>Local-first tree notes with Markdown at every node</p>
      </div>
    </div>
  `
}

function renderTopbar(activeKey) {
  return `
    <header class="topbar">
      ${renderBrandTagline()}
      ${renderLanguageSwitch(activeKey)}
    </header>
  `
}

function resolveMediaPath(relativePath) {
  return joinBasePath(basePath, relativePath)
}

function renderHeroMedia(content) {
  const hero = content.media.hero
  return `
    <div class="hero-visual">
      <div class="preview-heading">
        <h3>${hero.label}</h3>
        <span class="preview-badge">Actual product media</span>
      </div>
      <figure class="media-frame hero-media-frame">
        <img src="${resolveMediaPath(hero.src)}" alt="${escapeHtml(hero.alt)}" loading="eager" />
      </figure>
      <div class="media-caption">
        <strong>${hero.title}</strong>
        <p>${hero.caption}</p>
      </div>
    </div>
  `
}

function renderFeatureCards(content) {
  return `
    <section class="section-stack feature-section">
      <h3 class="section-title">${content.featuresTitle}</h3>
      <div class="section-grid">
        ${content.features.map((feature) => `
          <article class="feature-card">
            <h3>${feature.title}</h3>
            <p>${feature.body}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `
}

function renderUseCases(content) {
  return `
    <section class="section-stack use-case-section">
      <h3 class="section-title">${content.useCasesTitle}</h3>
      <div class="use-case-row">
        ${content.useCases.map((item) => `
          <article class="use-case-chip">
            <p>${item}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `
}

function renderExampleStrip(content) {
  const workflow = content.media.workflow

  return `
    <section class="section-stack example-section">
      <div class="example-card workflow-card">
        <div class="example-copy">
          <h3>${content.workflowTitle}</h3>
          <p>${content.workflowBody}</p>
          <div class="workflow-labels">
            <span class="example-node">${workflow.videoLabel}</span>
            <span class="example-node">${workflow.imageLabel}</span>
          </div>
        </div>
        <div class="workflow-media-stack">
          <div class="example-document workflow-video-card">
            <video
              autoplay
              muted
              loop
              playsinline
              controls
              poster="${resolveMediaPath(workflow.posterSrc)}"
            >
              <source src="${resolveMediaPath(workflow.videoSrc)}" type="video/webm" />
            </video>
          </div>
          <div class="example-document workflow-image-card">
            <img src="${resolveMediaPath(workflow.posterSrc)}" alt="${escapeHtml(workflow.imageAlt)}" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  `
}

function renderMediaGallery(content) {
  return `
    <section class="section-stack media-gallery-section">
      <h3 class="section-title">${content.mediaGalleryTitle}</h3>
      <div class="media-gallery-grid">
        ${content.media.gallery.map((item) => `
          <article class="media-card">
            <figure class="media-frame">
              <img src="${resolveMediaPath(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy" />
            </figure>
            <div class="media-card-copy">
              <h3>${item.title}</h3>
              <p>${item.body}</p>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `
}

function renderInfoLists(content) {
  return `
    <section class="section-stack info-section">
      <div class="section-grid info-grid">
        <article class="info-card">
          <h3>${content.requirementsTitle}</h3>
          <ul class="list-card">
            ${content.requirements.map((item, index) => `
              <li><span class="list-index">${index + 1}</span><span>${item}</span></li>
            `).join('')}
          </ul>
        </article>
        <article class="info-card info-card-wide">
          <h3>${content.installTitle}</h3>
          <ul class="list-card">
            ${content.installSteps.map((item, index) => `
              <li><span class="list-index">${index + 1}</span><span>${item}</span></li>
            `).join('')}
          </ul>
        </article>
      </div>
    </section>
  `
}

function renderLocalizedPage(locale, pageKey = locale) {
  const content = siteContent[locale]
  document.documentElement.lang = content.languageCode

  app.innerHTML = `
    <div class="site-shell">
      ${renderTopbar(pageKey === 'root' ? locale : pageKey)}
      <section class="hero">
        <article class="hero-copy">
          <div class="eyebrow">${content.alphaBadge}</div>
          <h2>${content.headline}</h2>
          <p class="section-intro">${content.intro}</p>
          <p class="section-intro">${content.alphaCopy}</p>
          <div class="cta-row" id="primary-download-row">
            <span class="button-link primary disabled" aria-disabled="true">${content.primaryCtaLabel}</span>
          </div>
          <div class="meta-inline">
            <span id="version-pill" class="version-pill">${content.versionPrefix}: --</span>
          </div>
        </article>
        ${renderHeroMedia(content)}
      </section>
      <section class="content-layout">
        <div class="content-main">
          ${renderMediaGallery(content)}
          ${renderFeatureCards(content)}
          ${renderUseCases(content)}
          ${renderExampleStrip(content)}
          <section class="section-stack sidebar-section">
            <div class="downloads-layout">
              <article class="download-card recommended">
                <h3 id="recommended-title">${content.primaryCtaLabel}</h3>
                <p id="recommended-copy">${content.primaryCtaIdle}</p>
                <div class="cta-row" id="recommended-actions">
                  <span class="button-link primary disabled" aria-disabled="true">${content.primaryCtaLabel}</span>
                </div>
              </article>
              <article class="download-card">
                <h3>${content.manualLabel}</h3>
                <div id="manual-targets" class="download-grid"></div>
              </article>
            </div>
          </section>
          ${renderInfoLists(content)}
        </div>
      </section>
      <div id="fallback-banner"></div>
      <p class="footer-note">GitHub Releases remain the source of binaries. The website only recommends and routes to the correct target.</p>
    </div>
  `

  hydrateReleaseState(locale)
}

function resolvePreferredLocale() {
  return navigator.language && navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function setFallbackState(locale) {
  const content = siteContent[locale]
  const fallbackBanner = document.querySelector('#fallback-banner')
  const primaryDownloadRow = document.querySelector('#primary-download-row')
  const versionPill = document.querySelector('#version-pill')
  const recommendedCopy = document.querySelector('#recommended-copy')
  const recommendedActions = document.querySelector('#recommended-actions')
  const manualTargets = document.querySelector('#manual-targets')

  versionPill.textContent = `${content.versionPrefix}: ${content.unavailableLabel}`
  primaryDownloadRow.innerHTML = `
    <a class="button-link primary" href="${releasesPageUrl()}" target="_blank" rel="noreferrer">${content.fallbackCta}</a>
  `
  recommendedCopy.textContent = content.fallbackBody
  recommendedActions.innerHTML = `
    <a class="button-link primary" href="${releasesPageUrl()}" target="_blank" rel="noreferrer">${content.fallbackCta}</a>
  `
  manualTargets.innerHTML = `
    <div class="download-target">
      <div>
        <strong>GitHub Releases</strong>
        <span>${content.fallbackBody}</span>
      </div>
      <a class="mini-link" href="${releasesPageUrl()}" target="_blank" rel="noreferrer">${content.fallbackCta}</a>
    </div>
  `
  fallbackBanner.innerHTML = `<div class="status-banner"><strong>${content.fallbackTitle}</strong><br />${content.fallbackBody}</div>`
}

function renderManualTargets(locale, metadata, recommendedTarget) {
  const content = siteContent[locale]
  const labels = targetLabels[locale]
  const manualTargets = document.querySelector('#manual-targets')
  manualTargets.innerHTML = supportedTargets.map((target) => {
    const entry = metadata.targets[target]
    const summary = recommendedTarget === target
      ? content.manualRecommended
      : entry.kind === 'installer'
        ? content.manualPrimary
        : content.manualSecondary
    return `
      <div class="download-target">
        <div>
          <strong>${labels[target]}</strong>
          <span>${summary} · ${entry.fileName}</span>
        </div>
        <a class="mini-link" href="${entry.url}">${content.manualCta}</a>
      </div>
    `
  }).join('')
}

async function hydrateReleaseState(locale) {
  const content = siteContent[locale]
  const primaryDownloadRow = document.querySelector('#primary-download-row')
  const versionPill = document.querySelector('#version-pill')
  const recommendedTitle = document.querySelector('#recommended-title')
  const recommendedCopy = document.querySelector('#recommended-copy')
  const recommendedActions = document.querySelector('#recommended-actions')

  const state = await resolveReleaseState()

  if (state.kind !== 'ready') {
    setFallbackState(locale)
    return
  }

  const metadata = state.metadata
  const recommendedTarget = state.recommendedTarget
  const labels = targetLabels[locale]
  const recommendedEntry = recommendedTarget ? metadata.targets[recommendedTarget] : null

  versionPill.textContent = `${content.versionPrefix}: ${metadata.name}${metadata.prerelease ? ' · Alpha' : ''}`
  recommendedTitle.textContent = content.primaryCtaLabel

  if (recommendedEntry && recommendedTarget) {
    recommendedCopy.textContent = `${labels[recommendedTarget]} · ${recommendedEntry.fileName}`
    primaryDownloadRow.innerHTML = `
      <a class="button-link primary" href="${recommendedEntry.url}">${content.primaryCtaLabel}</a>
    `
    recommendedActions.innerHTML = `
      <a class="button-link primary" href="${recommendedEntry.url}">${content.primaryCtaLabel}</a>
      <a class="button-link secondary" href="${releasesPageUrl()}" target="_blank" rel="noreferrer">GitHub Releases</a>
    `
  } else {
    recommendedCopy.textContent = content.fallbackBody
    primaryDownloadRow.innerHTML = `
      <a class="button-link primary" href="${releasesPageUrl()}" target="_blank" rel="noreferrer">${content.fallbackCta}</a>
    `
    recommendedActions.innerHTML = `
      <a class="button-link primary" href="${releasesPageUrl()}" target="_blank" rel="noreferrer">${content.fallbackCta}</a>
    `
  }

  renderManualTargets(locale, metadata, recommendedTarget)
}

if (page === 'root') {
  renderLocalizedPage(resolvePreferredLocale(), 'root')
} else if (page === 'zh' || page === 'en') {
  renderLocalizedPage(page)
} else {
  renderLocalizedPage(resolvePreferredLocale(), 'root')
}
