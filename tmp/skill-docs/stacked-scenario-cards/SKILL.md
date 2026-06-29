---
name: stacked-scenario-cards
description: Use when implementing a scenario or use-case section that should feel like layered or paged cards, where text-focused cards stack visually and the active card takes prominence while nearby cards recede.
---

# Stacked Scenario Cards

中文说明：

这个技能用于实现“层叠场景卡片 / 分页感卡片区”。  
它适合放“适用场景 / best-fit scenarios / use cases”，核心不是展示截图，而是用文字和层级感传达：

- 这个产品适合什么场景
- 哪些问题它更擅长解决
- 为什么这些场景匹配这个产品

重点是：

- 卡片是文本主导 `text-first`
- 同时保留几张卡的层叠感
- 其中一张卡是当前主角
- 前后卡片退后，但不消失

## 适用场景

用在这些需求里最合适：

- “适用场景”
- “更适合这些人 / 这些问题”
- “谁应该用这个产品”
- “这个产品的最佳使用边界”

不要用于这些情况：

- 需要一张张展示功能截图
- 要做完整轮播 banner
- 要做左右图文切换

## 核心规则

1. 这是场景卡片区，不是功能演示区
2. 卡片要有层叠关系，但文字始终可读
3. 当前 active card 最突出
4. 前后卡片只做轻微退后，不要夸张 3D
5. 无 JS 时也必须能退化成普通卡片列表

## 数据模型

每张卡建议有：

```js
{
  kicker: "场景 01",
  title: "需要长期维护章节层级的课程笔记",
  body: "如果你的学习资料不是零散摘录，而是有章节、有分支、有习题和参考材料的体系化内容，这种结构会更稳。",
  accent: "结构化学习笔记"
}
```

## 最小实现结构

### HTML / 渲染结构

```html
<section class="scenario-story" data-scenario-story>
  <div class="scenario-stack">
    <article class="scenario-card" data-scenario-step data-step-index="0">
      <div class="scenario-kicker">场景 01</div>
      <h4>需要长期维护章节层级的课程笔记</h4>
      <p>如果你的学习资料不是零散摘录，而是有章节、有分支、有习题和参考材料的体系化内容，这种结构会更稳。</p>
      <div class="scenario-accent">结构化学习笔记</div>
    </article>
  </div>
</section>
```

## 最小 CSS 模板

```css
.scenario-stack {
  display: grid;
  gap: 18px;
}

.scenario-card {
  position: relative;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(44, 121, 90, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(252, 250, 246, 0.92));
}

.scenario-kicker {
  display: inline-flex;
  margin-bottom: 18px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 0.82rem;
}

.scenario-card h4 {
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 2.4vw, 2.4rem);
}

.scenario-card p {
  margin: 0;
  line-height: 1.72;
}

.scenario-accent {
  margin-top: 22px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@media (min-width: 981px) {
  .scenario-story.is-enhanced .scenario-stack {
    gap: 0;
    padding-bottom: 18px;
  }

  .scenario-story.is-enhanced .scenario-card {
    position: sticky;
    top: 96px;
    min-height: 56vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    transition:
      transform 220ms ease,
      opacity 220ms ease,
      box-shadow 220ms ease,
      border-color 220ms ease;
  }

  .scenario-story.is-enhanced .scenario-card[data-position="before"] {
    transform: translateY(-18px) scale(0.97);
  }

  .scenario-story.is-enhanced .scenario-card[data-position="after"] {
    transform: translateY(28px) scale(0.98);
  }

  .scenario-story.is-enhanced .scenario-card[data-active="false"] {
    opacity: 0.64;
  }

  .scenario-story.is-enhanced .scenario-card[data-active="true"] {
    opacity: 1;
    border-color: rgba(44, 121, 90, 0.26);
    box-shadow: 0 24px 42px rgba(44, 121, 90, 0.1);
  }
}

@media (max-width: 980px) {
  .scenario-card {
    position: relative;
    min-height: unset;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scenario-card {
    transition: none !important;
  }
}
```

## 最小 JS 模板

```js
function findActiveIndex(nodes, thresholdRatio = 0.45) {
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

function initializeScenarioStory(section) {
  const stepNodes = [...section.querySelectorAll('[data-scenario-step]')]
  let ticking = false

  function update() {
    ticking = false
    const activeIndex = findActiveIndex(stepNodes, 0.45)

    stepNodes.forEach((node, index) => {
      const depth = Math.abs(index - activeIndex)
      node.dataset.active = index === activeIndex ? 'true' : 'false'
      node.dataset.depth = String(Math.min(depth, 3))
      node.dataset.position = index < activeIndex ? 'before' : index > activeIndex ? 'after' : 'current'
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
}
```

## 参数建议

推荐起步值：

- sticky top：`84px - 108px`
- card min-height：`50vh - 58vh`
- before 卡：`translateY(-14px ~ -20px)` + `scale(0.96 ~ 0.98)`
- after 卡：`translateY(20px ~ 32px)` + `scale(0.97 ~ 0.99)`
- inactive opacity：`0.58 - 0.7`

如果问题是：

- 卡片重叠太狠：减小位移、增大 gap
- 看起来像功能轮播：说明视觉做得太像舞台切换，需要强化文字排版，弱化媒体感
- 手机端卡住视口：移动端去掉 sticky

## 设计提醒

这类 section 的重点不是“炫”，而是“有层次但可读”。  
所以优先级应该是：

1. 文本易读
2. active 层次明确
3. 前后卡轻微退后
4. 动画只是辅助

## 验收清单

- 这是场景卡片区，不是功能轮播
- 当前卡片最突出
- 前后卡片仍然可见，但明显退后
- 无 JS 时能正常阅读
- `prefers-reduced-motion` 下不会强行动画
- 移动端退化成普通纵向卡片

## 常见失败模式

下面任一出现，都说明实现偏了：

- 卡片重叠到文字读不清
- section 看起来像截图轮播
- 手机上 sticky 把滚动体验搞坏
- 动画比文案本身更吸引注意力
- 没有图片就完全失效
