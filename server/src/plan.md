## master template

```html
<style>
  .slide {
    position: relative;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    padding: 60px;
    box-sizing: border-box;
    background-color: #F4F7FC;
    background-image: radial-gradient(circle, rgba(21,101,192,0.03) 1px, transparent 1px);
    background-size: 20px 20px;
    --primary: #1565C0;
    --secondary: #42A5F5;
    --accent: #FF7043;
    --background: #F4F7FC;
    --text: #1A237E;
    --font-heading: 'Arial', sans-serif;
    --font-subheading: 'Arial', sans-serif;
    --font-body: 'Arial', sans-serif;
    font-family: var(--font-body);
    color: var(--text);
  }
  .slide * {
    box-sizing: border-box;
  }
  .persistent {
    position: absolute;
    z-index: 10;
  }
  .persistent.logo {
    top: 20px;
    left: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }
  .persistent.slide-number {
    bottom: 20px;
    right: 20px;
    font-size: 14px;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-heading);
    line-height: 1;
  }
  .persistent.slide-number::after {
    content: attr(data-slide-num);
    display: block;
  }
  .persistent.accent-line {
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--primary);
  }
  .title {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 36px;
    color: var(--primary);
    margin-bottom: 12px;
    line-height: 1.2;
  }
  .subtitle {
    font-family: var(--font-subheading);
    font-weight: 600;
    font-size: 24px;
    color: var(--secondary);
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .kicker {
    font-family: var(--font-body);
    font-weight: 400;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 16px;
  }
  .accent-bar {
    width: 60px;
    height: 4px;
    background: var(--accent);
    margin-bottom: 12px;
  }
  .quote {
    font-style: italic;
    color: var(--secondary);
    border-left: 3px solid var(--accent);
    padding-left: 16px;
    margin: 20px 0;
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.5;
  }
  .content {
    position: relative;
    z-index: 1;
  }
</style>
<div class="slide">{{CONTENT}}</div>
```


## slide 1

```html
<style>
  .slide {
    position: relative;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    padding: 60px;
    box-sizing: border-box;
    background-color: #F4F7FC;
    background-image: radial-gradient(circle, rgba(21,101,192,0.03) 1px, transparent 1px);
    background-size: 20px 20px;
    --primary: #1565C0;
    --secondary: #42A5F5;
    --accent: #FF7043;
    --background: #F4F7FC;
    --text: #1A237E;
    --font-heading: 'Arial', sans-serif;
    --font-subheading: 'Arial', sans-serif;
    --font-body: 'Arial', sans-serif;
    font-family: var(--font-body);
    color: var(--text);
  }
  .slide * {
    box-sizing: border-box;
  }
  .persistent {
    position: absolute;
    z-index: 10;
  }
  .persistent.logo {
    top: 20px;
    left: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }
  .persistent.slide-number {
    bottom: 20px;
    right: 20px;
    font-size: 14px;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-heading);
    line-height: 1;
  }
  .persistent.slide-number::after {
    content: attr(data-slide-num);
    display: block;
  }
  .persistent.accent-line {
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--primary);
  }
  .title {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 36px;
    color: var(--primary);
    margin-bottom: 12px;
    line-height: 1.2;
  }
  .subtitle {
    font-family: var(--font-subheading);
    font-weight: 600;
    font-size: 24px;
    color: var(--secondary);
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .kicker {
    font-family: var(--font-body);
    font-weight: 400;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 16px;
  }
  .accent-bar {
    width: 60px;
    height: 4px;
    background: var(--accent);
    margin-bottom: 12px;
  }
  .quote {
    font-style: italic;
    color: var(--secondary);
    border-left: 3px solid var(--accent);
    padding-left: 16px;
    margin: 20px 0;
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.5;
  }
  .content {
    position: relative;
    z-index: 1;
  }
</style>
<div class="slide">{{CONTENT}}</div>
```

## slide 2

```html
<div class="content">
  <h1 class="title" style="position: absolute; top: 40px; left: 60px; font-size: 40px;">The Present: Automated &amp; Integrated Testing</h1>

  <div style="position: absolute; top: 120px; left: 60px; width: 520px; height: 420px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(21,101,192,0.2);">
    <img src="https://images.pexels.com/photos/36522029/pexels-photo-36522029.jpeg?auto=compress&cs=tinysrgb&h=350" alt="Automated testing dashboard interface" style="width: 100%; height: 100%; object-fit: cover; display: block;">
    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--primary), var(--accent));"></div>
  </div>

  <div style="position: absolute; top: 120px; left: 620px; width: 580px; height: 420px; padding-left: 30px;">
    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: linear-gradient(180deg, var(--primary), var(--secondary)); opacity: 0.4; border-radius: 1px;"></div>
    
    <ul style="list-style: none; padding: 0; margin: 0;">
      <li style="display: flex; align-items: flex-start; margin-bottom: 18px;">
        <span style="display: inline-block; width: 8px; height: 8px; background: var(--primary); border-radius: 50%; margin-top: 8px; margin-right: 14px; flex-shrink: 0;"></span>
        <div>
          <strong style="display: block; font-family: var(--font-heading); font-size: 17px; color: var(--primary); margin-bottom: 2px;">Automated Execution</strong>
          <span style="font-size: 15px; color: var(--text); line-height: 1.4;">CI/CD pipelines run tests automatically</span>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start; margin-bottom: 18px;">
        <span style="display: inline-block; width: 8px; height: 8px; background: var(--secondary); border-radius: 50%; margin-top: 8px; margin-right: 14px; flex-shrink: 0;"></span>
        <div>
          <strong style="display: block; font-family: var(--font-heading); font-size: 17px; color: var(--primary); margin-bottom: 2px;">Shift-Left Testing</strong>
          <span style="font-size: 15px; color: var(--text); line-height: 1.4;">Testing starts early in the development cycle</span>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start; margin-bottom: 18px;">
        <span style="display: inline-block; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; margin-top: 8px; margin-right: 14px; flex-shrink: 0;"></span>
        <div>
          <strong style="display: block; font-family: var(--font-heading); font-size: 17px; color: var(--primary); margin-bottom: 2px;">AI-Powered Tools</strong>
          <span style="font-size: 15px; color: var(--text); line-height: 1.4;">Intelligent test generation and defect prediction</span>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start; margin-bottom: 18px;">
        <span style="display: inline-block; width: 8px; height: 8px; background: var(--primary); border-radius: 50%; margin-top: 8px; margin-right: 14px; flex-shrink: 0;"></span>
        <div>
          <strong style="display: block; font-family: var(--font-heading); font-size: 17px; color: var(--primary); margin-bottom: 2px;">Real-Time Feedback</strong>
          <span style="font-size: 15px; color: var(--text); line-height: 1.4;">Instant results with dashboards and alerts</span>
        </div>
      </li>
      <li style="display: flex; align-items: flex-start;">
        <span style="display: inline-block; width: 8px; height: 8px; background: var(--secondary); border-radius: 50%; margin-top: 8px; margin-right: 14px; flex-shrink: 0;"></span>
        <div>
          <strong style="display: block; font-family: var(--font-heading); font-size: 17px; color: var(--primary); margin-bottom: 2px;">Collaborative Culture</strong>
          <span style="font-size: 15px; color: var(--text); line-height: 1.4;">QA integrated into agile teams (DevOps)</span>
        </div>
      </li>
    </ul>
  </div>

  <div style="position: absolute; bottom: 50px; right: 60px; width: 500px;">
    <div style="display: flex; align-items: flex-start;">
      <div style="width: 3px; height: 50px; background: var(--accent); margin-right: 14px; flex-shrink: 0; border-radius: 2px;"></div>
      <p style="font-style: italic; font-size: 17px; color: var(--secondary); line-height: 1.5; margin: 0; font-weight: 400;">
        “Testing is now a continuous, integrated practice ensuring quality at speed.”
      </p>
    </div>
  </div>
</div>
```
