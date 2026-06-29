---
name: story-stage-slide-switch
description: Use when implementing a scroll-driven or dot-driven feature showcase where each step is a single full slide containing left-side copy and right-side media, and only one slide should be visible at a time.
---

# Story Stage Slide Switch

中文说明：

这个技能用于实现“单舞台整卡切换”的功能演示区。  
目标不是“左边一列功能说明，右边单独换图”，而是：

- 一个共享舞台 `single shared stage`
- 一次只显示一张完整 slide
- slide 内部同时包含左侧文案和右侧图片/视频
- 滚动或底部圆点切换时，整张卡一起切换

如果你想要的是“跑马灯 / 产品舞台 / 故事化功能演示”，就用这个技能。

## 适用场景

触发这个技能的典型需求：

- 做产品官网的功能演示区
- 左文右图，但不能两边各自独立
- 滚轮滚动时，一张功能卡切到下一张
- 底部有圆点导航，点击圆点也能切换
- 桌面端像 storytelling，移动端退化成普通卡片

不要用于这些情况：

- 所有功能一次性平铺展示
- 左侧永久展示完整功能列表
- 只想做单纯图片轮播

## 核心规则

必须满足：

1. 只存在一个主舞台
2. 同一时刻只存在一个 active slide
3. 文案和媒体属于同一张 slide
4. 切换时整张 slide 一起切换
5. 切换进度由整个 section 的滚动进度决定

绝对不要这样做：

- 左边是一整列功能卡，右边只是跟着换图
- 用一条隐藏占位轨道制造大量空白
- 点击圆点后滚到空白区域

## 数据模型

每张 slide 建议有这些字段：

```js
{
  eyebrow: "01",
  title: "结构始终可见",
  body: "树状结构不是附属导航，而是知识体系本身。",
  mediaLabel: "树视图",
  mediaType: "image", // or "video"
  src: "assets/demo-tree.png",
  alt: "树视图截图",
  posterSrc: "assets/demo-tree-poster.png" // only for video
}
```

## 最小实现结构

### HTML / 渲染结构

```html
<section class="demo-story" data-demo-story data-demo-count="4">
  <div class="demo-story-track" data-demo-track>
    <div class="demo-stage">
      <div class="demo-stage-sticky">
        <div class="demo-stage-viewport" data-demo-preview></div>
        <div class="demo-stage-dots">
          <button class="demo-dot is-active" data-demo-dot data-step-index="0"></button>
          <button class="demo-dot" data-demo-dot data-step-index="1"></button>
          <button class="demo-dot" data-demo-dot data-step-index="2"></button>
          <button class="demo-dot" data-demo-dot data-step-index="3"></button>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Active slide 模板

```html
<article class="demo-preview-card">
  <div class="demo-slide-copy">
    <div class="story-step-meta">
      <span class="step-index">01</span>
      <span class="step-label">树视图</span>
    </div>
    <h4>结构始终可见</h4>
    <p>树状结构不是附属导航，而是知识体系本身。</p>
  </div>
  <div class="demo-slide-media">
    <figure class="media-frame demo-preview-frame">
      <img src="assets/demo-tree.png" alt="树视图截图" />
    </figure>
  </div>
</article>
```

## 最小 CSS 模板

```css
.demo-story-track {
  position: relative;
}

.demo-stage-sticky {
  display: grid;
  gap: 18px;
}

.demo-preview-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  display: grid;
  gap: 18px;
  padding: 24px;
}

.demo-preview-frame {
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 16px;
}

.demo-preview-frame img,
.demo-preview-frame video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.demo-stage-dots {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.demo-dot {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  cursor: pointer;
}

.demo-dot.is-active {
  width: 28px;
  background: rgb(44, 121, 90);
}

@media (min-width: 981px) {
  .demo-story.is-enhanced .demo-story-track {
    min-height: calc(var(--demo-steps, 4) * 44vh);
  }

  .demo-story.is-enhanced .demo-stage-sticky {
    position: sticky;
    top: 24px;
  }

  .demo-story.is-enhanced .demo-preview-card {
    grid-template-columns: minmax(280px, 0.78fr) minmax(520px, 1.22fr);
    align-items: center;
    min-height: 68vh;
  }
}

@media (max-width: 980px) {
  .demo-preview-card {
    grid-template-columns: 1fr;
  }
}
```

## 最小 JS 模板

### 1. 渲染 active slide

```js
function renderDemoPreview(step) {
  return `
    <article class="demo-preview-card">
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
          ${step.mediaType === 'video'
            ? `<video autoplay muted loop playsinline controls poster="${step.posterSrc}">
                 <source src="${step.src}" type="video/webm" />
               </video>`
            : `<img src="${step.src}" alt="${step.alt}" />`}
        </figure>
      </div>
    </article>
  `
}
```

### 2. 用整个 section 的滚动进度算 activeIndex

```js
function initializeDemoStory(section, steps) {
  const trackNode = section.querySelector('[data-demo-track]')
  const previewNode = section.querySelector('[data-demo-preview]')
  const dotNodes = [...section.querySelectorAll('[data-demo-dot]')]
  const totalSteps = steps.length
  let activeIndex = -1
  let ticking = false

  section.style.setProperty('--demo-steps', String(totalSteps))

  function resolveActiveIndex() {
    const rect = trackNode.getBoundingClientRect()
    const scrollableDistance = Math.max(rect.height - window.innerHeight, 1)
    const progress = Math.min(Math.max(-rect.top / scrollableDistance, 0), 1)
    return Math.min(totalSteps - 1, Math.round(progress * (totalSteps - 1)))
  }

  function update() {
    ticking = false
    const nextIndex = resolveActiveIndex()
    if (nextIndex === activeIndex) return
    activeIndex = nextIndex
    previewNode.innerHTML = renderDemoPreview(steps[activeIndex])
    dotNodes.forEach((node, index) => {
      node.classList.toggle('is-active', index === activeIndex)
    })
  }

  function requestUpdate() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }

  section.classList.add('is-enhanced')
  requestUpdate()
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate)

  dotNodes.forEach((node) => {
    node.addEventListener('click', () => {
      const index = Number(node.dataset.stepIndex || '0')
      const rect = trackNode.getBoundingClientRect()
      const trackTop = window.scrollY + rect.top
      const scrollableDistance = Math.max(trackNode.offsetHeight - window.innerHeight, 0)
      const progress = totalSteps <= 1 ? 0 : index / (totalSteps - 1)
      window.scrollTo({
        top: trackTop + scrollableDistance * progress,
        behavior: 'smooth',
      })
    })
  })
}
```

## 参数建议

推荐起步值：

- 每个 slide 的滚动距离：`40vh - 46vh`
- sticky top：`20px - 32px`
- 桌面端主舞台高度：`64vh - 70vh`
- 左右比：`0.78 / 1.22` 左右

如果问题是：

- 切换太慢：先减小 `--demo-steps * vh`
- 空白太大：检查是否偷偷用了隐藏占位轨道
- 左右割裂：说明你不是“单舞台”，而是“左列表 + 右预览”

## 验收清单

- 页面里同一时刻只显示一个 active slide
- slide 内部左文右图一起切换
- 滚动不会出现大段空白
- 圆点点击会切到对应 slide，不会跳到空白
- 桌面端是舞台式切换，移动端能正常退化
- `prefers-reduced-motion: reduce` 下不强行动画

## 常见失败模式

下面任一出现，都说明实现错了：

- 左边长期显示完整功能列表
- 右边只是换图，左边不换
- 点圆点跳到空白区
- slide 高度忽大忽小
- 功能区和下一 section 之间有很长空白
