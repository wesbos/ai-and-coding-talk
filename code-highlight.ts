import { Token, highlight } from "@code-hike/lighter";
import cobalt2 from './cobalt2.js';
const output = document.getElementById("output");

const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="text/display"]');

scripts.forEach(script => turnScriptIntoCodeBlock(script));

// Watch for these items to be in view with intersection observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      type(entry.target as HTMLPreElement);
    }
  });
}, {
  rootMargin: '0px 0px -100px 0px',
  threshold: 0.5,
});


async function turnScriptIntoCodeBlock(script: HTMLScriptElement) {
  const pre = document.createElement('pre');
  const code = script.innerHTML;
  const lines = code.split('\n');
  // Transfer over data attributes
  pre.dataset.animate = script.dataset.animate;
  // Remove the last line if it is empty
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  // Remove the first line if it is empty
  if (lines[0] === '') {
    lines.shift();
  }
  if(!lines.length) {
    console.log(`No lines in ${script.getAttribute('src')}`);
    return;
  }
  // Get the indent of the first line
  const indent = lines.at(0).match(/^\s*/)[0];
  // console.log(`Need to remove ${indent} from all lines`);
  const regex = new RegExp(`^ {0,${indent.length}}`, 'g');
  const cleanCode = lines.map(line => line.replace(regex, '')).join('\n');

  const highlighted = await highlight(cleanCode, script.getAttribute('lang') || 'ts', cobalt2, {
    scopes: true,
  });
  pre.innerHTML = renderLines(highlighted.lines);
  pre.classList.add('code-block');
  script.insertAdjacentElement('afterend', pre);
  observer.observe(pre);
  // Type it in
  type(pre);
}

async function populateColors() {
  const { lines, colors } = await highlight(`const`, "ts", cobalt2);

  // convert colors to CSS variables if they arent on the body already
  if (document.documentElement.style.getPropertyValue('--background') === '') {
    document.documentElement.style.cssText = objectToCSSVaribles(colors);
  }
}
populateColors();



function renderLines(lines: Token[][]) {
  return lines.map((line, i) => `<span class="line line${i}">${renderLine(line)}</span>`).join('\n');
}

function renderLine(line: Token[]) {
  return line.map((token) => {
    return `<span class="token" data-scopes="${token.scopes?.join(' ')}" style="${objectToCSS(token.style || {})}">${token.content}</span>`;
  }).join('');
}

function objectToCSS(obj: Record<string, string>) {
  return Object.entries(obj).map(([key, value]) => `${key}: ${value}`).join(';');
}

function objectToCSSVaribles(obj: Record<string, string>) {
  return Object.entries(obj).map(([key, value]) => `--${key}: ${value}`).join(';');
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


function makeScroller() {
  let lastScrolledElement;
  let timeoutID = 0;
  return function scrollElementIntoView(element) {
    if (!element) return

    if (lastScrolledElement) {
      lastScrolledElement.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      })
    }

    lastScrolledElement = element

    window.clearTimeout(timeoutID)

    timeoutID = window.setTimeout(() => {
      lastScrolledElement = null
    }, 250)

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })
  }
}

const typingState: Map<HTMLPreElement, boolean> = new Map();

async function type(pre: HTMLPreElement) {
  if(pre.dataset.animate === 'false') return;
  // If this <pre> is already being animated, return
  if (typingState.get(pre)) return;
  // Otherwise, set it to being animated
  typingState.set(pre, true);

  // Select all the spans and hide them
  const allTokens = pre?.querySelectorAll('span.token');
  if (!allTokens) {
    console.log(`No tokens found in ${pre}`);
    return;
  };
  const FADE_TIME = 2000;
  const FADE_PER_TOKEN = Math.max(FADE_TIME / allTokens.length, 15);
  // add hide class to all tokens
  allTokens.forEach((token) => token.classList.add('hide'));

  // Make a scroller for this pre
  const scroller = makeScroller();
  // Mark this pre as being typed
  typingState.set(pre, true);
  // loop through all tokens and remove hide class
  for (const token of allTokens) {
    token.classList.remove('hide');
    scroller(token);
    // token.scrollIntoView({ behavior: 'instant', block: 'center' });
    // wait 1ms for every character in the token for a min of 5ms and a max of 35ms
    await wait(FADE_PER_TOKEN);
  }
  // Scroll to top
  pre.scrollTo({ top: 0, behavior: 'smooth' });
  // Mark this pre as not being typed
  typingState.set(pre, false);
}


