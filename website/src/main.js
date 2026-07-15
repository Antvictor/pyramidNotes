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

function renderStoryMedia(media, eager = false, zoom = null) {
  const zoomStyle = zoom ? ` style="transform:scale(${zoom.scale});transform-origin:${zoom.origin}"` : ''

  if (media.mediaType === 'video') {
    return `
      <video
        autoplay
        muted
        loop
        playsinline
        controls
        poster="${resolveMediaPath(media.posterSrc)}"
      >
        <source src="${resolveMediaPath(media.src)}" type="video/webm" />
      </video>
    `
  }

  return `<img src="${resolveMediaPath(media.src)}" alt="${escapeHtml(media.alt)}" loading="${eager ? 'eager' : 'lazy'}"${zoomStyle} />`
}

function renderHeroMedia(content) {
  const hero = content.media.hero
  return `
    <section class="hero-visual hero-panel">
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
    </section>
  `
}

function renderSectionLead(title, intro) {
  return `
    <div class="section-lead">
      <h3 class="section-title">${title}</h3>
      <p class="section-intro">${intro}</p>
    </div>
  `
}

function renderDemoPreview(step) {
  return `
    <article class="demo-preview-card" data-demo-slide>
      <div class="demo-slide-copy">
        <div class="story-step-meta">
          <span class="step-index">${step.eyebrow}</span>
          <span class="step-label">${step.mediaLabel}</span>
        </div>
        <h4>${step.title}</h4>
        <p>${step.body}</p>
      </div>
      <div class="demo-slide-media">
        <figure class="media-frame demo-preview-frame">
          ${renderStoryMedia(step, true, step.zoom || null)}
        </figure>
      </div>
    </article>
  `
}

function renderDemoStory(content) {
  const firstStep = content.demoSteps[0]

  return `
    <section
      class="section-stack story-section demo-story"
      data-demo-story
      data-demo-count="${content.demoSteps.length}"
    >
      ${renderSectionLead(content.demoSectionTitle, content.demoSectionIntro)}
      <div class="demo-story-track" data-demo-track>
        <div class="demo-stage" data-demo-stage>
          <div class="demo-stage-sticky">
            <div class="demo-stage-viewport" data-demo-preview>
              ${renderDemoPreview(firstStep)}
            </div>
            <div class="demo-stage-dots">
              ${content.demoSteps.map((step, index) => `
                <button
                  type="button"
                  class="demo-dot${index === 0 ? ' is-active' : ''}"
                  data-demo-dot
                  data-step-index="${index}"
                  aria-label="${escapeHtml(step.title)}"
                ></button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>
  `
}

function renderWorkflowSection(content) {
  const workflow = content.media.workflow

  return `
    <section class="section-stack workflow-section">
      ${renderSectionLead(content.workflowSectionTitle, workflow.body)}
      <div class="workflow-stage">
        <div class="workflow-video-panel">
          <div class="preview-heading">
            <h3>${workflow.videoLabel}</h3>
            <span class="preview-badge">${content.alphaBadge}</span>
          </div>
          <figure class="media-frame workflow-media-frame">
            <img src="${resolveMediaPath(workflow.gifSrc)}" alt="${escapeHtml(workflow.gifAlt)}" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  `
}

function renderScenarioStory(content) {
  return `
    <section class="section-stack story-section scenario-story" data-scenario-story>
      ${renderSectionLead(content.scenarioSectionTitle, content.scenarioSectionIntro)}
      <div class="scenario-stack">
        ${content.scenarioSteps.map((step, index) => `
          <article class="scenario-card" data-scenario-step data-step-index="${index}">
            <div class="scenario-kicker">${step.kicker}</div>
            <h4>${step.title}</h4>
            <p>${step.body}</p>
            <div class="scenario-accent">${step.accent}</div>
          </article>
        `).join('')}
      </div>
    </section>
  `
}

function renderAudienceSection(content) {
  return `
    <section class="section-stack audience-section">
      ${renderSectionLead(content.audienceSectionTitle, content.audienceSectionIntro)}
      <div class="section-grid audience-grid">
        <article class="info-card audience-card">
          <h3>${content.fitTitle}</h3>
          <ul class="list-card">
            ${content.fitPoints.map((item, index) => `
              <li><span class="list-index">${index + 1}</span><span>${item}</span></li>
            `).join('')}
          </ul>
        </article>
        <article class="info-card audience-card audience-card-caution">
          <h3>${content.nonFitTitle}</h3>
          <ul class="list-card">
            ${content.nonFitPoints.map((item, index) => `
              <li><span class="list-index">${index + 1}</span><span>${item}</span></li>
            `).join('')}
          </ul>
        </article>
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
        <article class="hero-copy hero-panel">
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
        <!-- ${renderHeroMedia(content)} -->
      </section>
      <section class="content-layout">
        <div class="content-main">
          ${renderDemoStory(content)}
          ${renderWorkflowSection(content)}
          ${renderScenarioStory(content)}
          ${renderAudienceSection(content)}
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

  initializeStorytelling()
  hydrateReleaseState(locale)
}

function preloadDemoMedia(steps) {
  for (const step of steps.slice(1)) {
    if (step.mediaType === 'video') {
      const poster = new Image()
      poster.src = resolveMediaPath(step.posterSrc)
      continue
    }

    const image = new Image()
    image.src = resolveMediaPath(step.src)
  }
}

function setDemoPreview(previewNode, step) {
  previewNode.innerHTML = renderDemoPreview(step)
}

function findActiveIndex(nodes, thresholdRatio = 0.35) {
  const threshold = window.innerHeight * thresholdRatio
  let activeIndex = 0

  nodes.forEach((node, index) => {
    const rect = node.getBoundingClientRect()
    if (rect.top <= threshold) {
      activeIndex = index
    }
  })

  return activeIndex
}

function initializeDemoStory() {
  const section = document.querySelector('[data-demo-story]')
  if (!section) {
    return
  }

  const locale = siteContent[document.documentElement.lang.startsWith('zh') ? 'zh' : 'en']
  const steps = locale.demoSteps
  const trackNode = section.querySelector('[data-demo-track]')
  const previewNode = section.querySelector('[data-demo-preview]')
  const dotNodes = [...section.querySelectorAll('[data-demo-dot]')]
  const totalSteps = steps.length
  let activeIndex = -1
  let ticking = false

  section.style.setProperty('--demo-steps', String(totalSteps))
  preloadDemoMedia(steps)

  const resolveActiveIndex = () => {
    if (!trackNode || totalSteps <= 1) {
      return 0
    }

    const rect = trackNode.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const scrollableDistance = Math.max(rect.height - viewportHeight, 1)
    const progress = Math.min(Math.max(-rect.top / scrollableDistance, 0), 1)

    return Math.min(totalSteps - 1, Math.round(progress * (totalSteps - 1)))
  }

  const update = () => {
    ticking = false
    const nextIndex = resolveActiveIndex()

    if (nextIndex === activeIndex) {
      return
    }

    activeIndex = nextIndex
    dotNodes.forEach((node, index) => {
      const isActive = index === activeIndex
      node.classList.toggle('is-active', isActive)
      node.setAttribute('aria-current', isActive ? 'true' : 'false')
    })
    setDemoPreview(previewNode, steps[activeIndex])
  }

  const requestUpdate = () => {
    if (ticking) {
      return
    }

    ticking = true
    window.requestAnimationFrame(update)
  }

  section.classList.add('is-enhanced')
  dotNodes.forEach((node) => {
    node.addEventListener('click', () => {
      const index = Number(node.dataset.stepIndex || '0')
      if (!trackNode || totalSteps <= 1) {
        return
      }

      const viewportHeight = window.innerHeight
      const trackRect = trackNode.getBoundingClientRect()
      const trackTop = window.scrollY + trackRect.top
      const scrollableDistance = Math.max(trackNode.offsetHeight - viewportHeight, 0)
      const progress = index / (totalSteps - 1)
      const targetY = trackTop + scrollableDistance * progress

      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      })
    })
  })
  requestUpdate()
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate)
}

function initializeScenarioStory() {
  const section = document.querySelector('[data-scenario-story]')
  if (!section) {
    return
  }

  const stepNodes = [...section.querySelectorAll('[data-scenario-step]')]
  let ticking = false

  const update = () => {
    ticking = false
    const activeIndex = findActiveIndex(stepNodes, 0.45)

    stepNodes.forEach((node, index) => {
      const depth = Math.abs(index - activeIndex)
      node.dataset.active = index === activeIndex ? 'true' : 'false'
      node.dataset.depth = String(Math.min(depth, 3))
      node.dataset.position = index < activeIndex ? 'before' : index > activeIndex ? 'after' : 'current'
    })
  }

  const requestUpdate = () => {
    if (ticking) {
      return
    }

    ticking = true
    window.requestAnimationFrame(update)
  }

  section.classList.add('is-enhanced')
  requestUpdate()
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate)
}

function initializeImageZoom() {
  const lightbox = document.createElement('div')
  lightbox.className = 'image-lightbox'
  lightbox.innerHTML = `
    <div class="image-lightbox-content">
      <button class="image-lightbox-close" aria-label="Close zoom">&times;</button>
      <img src="" alt="" />
    </div>
  `
  document.body.appendChild(lightbox)

  const img = lightbox.querySelector('img')
  const closeBtn = lightbox.querySelector('.image-lightbox-close')

  function open(src, alt) {
    img.src = src
    img.alt = alt
    lightbox.classList.add('is-open')
  }

  function close() {
    lightbox.classList.remove('is-open')
    img.src = ''
  }

  closeBtn.addEventListener('click', close)
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) close()
  })

  document.addEventListener('dblclick', (e) => {
    const target = e.target.closest('.media-frame img')
    if (!target) return
    open(target.src, target.alt || '')
  })
}

function initializeStorytelling() {
  document.documentElement.classList.add('js-ready')
  initializeDemoStory()
  initializeScenarioStory()
}

initializeImageZoom()

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
