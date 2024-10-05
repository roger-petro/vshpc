var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function noop$1() {
}
const identity = (x) => x;
function assign(tar, src) {
  for (const k in src) tar[k] = src[k];
  return (
    /** @type {T & S} */
    tar
  );
}
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === "object" || typeof a === "function";
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    for (const callback of callbacks) {
      callback(void 0);
    }
    return noop$1;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
  component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
  if (definition) {
    const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
    return definition[0](slot_ctx);
  }
}
function get_slot_context(definition, ctx, $$scope, fn) {
  return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
  if (definition[2] && fn) {
    const lets = definition[2](fn(dirty));
    if ($$scope.dirty === void 0) {
      return lets;
    }
    if (typeof lets === "object") {
      const merged = [];
      const len = Math.max($$scope.dirty.length, lets.length);
      for (let i = 0; i < len; i += 1) {
        merged[i] = $$scope.dirty[i] | lets[i];
      }
      return merged;
    }
    return $$scope.dirty | lets;
  }
  return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
  if (slot_changes) {
    const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
    slot.p(slot_context, slot_changes);
  }
}
function get_all_dirty_from_scope($$scope) {
  if ($$scope.ctx.length > 32) {
    const dirty = [];
    const length = $$scope.ctx.length / 32;
    for (let i = 0; i < length; i++) {
      dirty[i] = -1;
    }
    return dirty;
  }
  return -1;
}
function null_to_empty(value) {
  return value == null ? "" : value;
}
function split_css_unit(value) {
  const split = typeof value === "string" && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
  return split ? [parseFloat(split[1]), split[2] || "px"] : [
    /** @type {number} */
    value,
    "px"
  ];
}
const is_client = typeof window !== "undefined";
let now = is_client ? () => window.performance.now() : () => Date.now();
let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop$1;
const tasks = /* @__PURE__ */ new Set();
function run_tasks(now2) {
  tasks.forEach((task) => {
    if (!task.c(now2)) {
      tasks.delete(task);
      task.f();
    }
  });
  if (tasks.size !== 0) raf(run_tasks);
}
function loop(callback) {
  let task;
  if (tasks.size === 0) raf(run_tasks);
  return {
    promise: new Promise((fulfill) => {
      tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      tasks.delete(task);
    }
  };
}
function append(target, node) {
  target.appendChild(node);
}
function get_root_for_style(node) {
  if (!node) return document;
  const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
  if (root && /** @type {ShadowRoot} */
  root.host) {
    return (
      /** @type {ShadowRoot} */
      root
    );
  }
  return node.ownerDocument;
}
function append_empty_stylesheet(node) {
  const style_element = element("style");
  style_element.textContent = "/* empty */";
  append_stylesheet(get_root_for_style(node), style_element);
  return style_element.sheet;
}
function append_stylesheet(node, style) {
  append(
    /** @type {Document} */
    node.head || node,
    style
  );
  return style.sheet;
}
function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}
function detach(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function destroy_each(iterations, detaching) {
  for (let i = 0; i < iterations.length; i += 1) {
    if (iterations[i]) iterations[i].d(detaching);
  }
}
function element(name) {
  return document.createElement(name);
}
function svg_element(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}
function text(data) {
  return document.createTextNode(data);
}
function space() {
  return text(" ");
}
function empty() {
  return text("");
}
function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
  if (value == null) node.removeAttribute(attribute);
  else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}
function init_binding_group(group) {
  let _inputs;
  return {
    /* push */
    p(...inputs) {
      _inputs = inputs;
      _inputs.forEach((input) => group.push(input));
    },
    /* remove */
    r() {
      _inputs.forEach((input) => group.splice(group.indexOf(input), 1));
    }
  };
}
function to_number(value) {
  return value === "" ? null : +value;
}
function children(element2) {
  return Array.from(element2.childNodes);
}
function set_data(text2, data) {
  data = "" + data;
  if (text2.data === data) return;
  text2.data = /** @type {string} */
  data;
}
function set_input_value(input, value) {
  input.value = value == null ? "" : value;
}
function set_style(node, key, value, important) {
  if (value == null) {
    node.style.removeProperty(key);
  } else {
    node.style.setProperty(key, value, "");
  }
}
function select_option(select, value, mounting) {
  for (let i = 0; i < select.options.length; i += 1) {
    const option = select.options[i];
    if (option.__value === value) {
      option.selected = true;
      return;
    }
  }
  if (!mounting || value !== void 0) {
    select.selectedIndex = -1;
  }
}
function select_value(select) {
  const selected_option = select.querySelector(":checked");
  return selected_option && selected_option.__value;
}
function toggle_class(element2, name, toggle) {
  element2.classList.toggle(name, !!toggle);
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
  return new CustomEvent(type, { detail, bubbles, cancelable });
}
class HtmlTag {
  constructor(is_svg = false) {
    /**
     * @private
     * @default false
     */
    __publicField(this, "is_svg", false);
    /** parent for creating node */
    __publicField(this, "e");
    /** html tag nodes */
    __publicField(this, "n");
    /** target */
    __publicField(this, "t");
    /** anchor */
    __publicField(this, "a");
    this.is_svg = is_svg;
    this.e = this.n = null;
  }
  /**
   * @param {string} html
   * @returns {void}
   */
  c(html) {
    this.h(html);
  }
  /**
   * @param {string} html
   * @param {HTMLElement | SVGElement} target
   * @param {HTMLElement | SVGElement} anchor
   * @returns {void}
   */
  m(html, target, anchor = null) {
    if (!this.e) {
      if (this.is_svg)
        this.e = svg_element(
          /** @type {keyof SVGElementTagNameMap} */
          target.nodeName
        );
      else
        this.e = element(
          /** @type {keyof HTMLElementTagNameMap} */
          target.nodeType === 11 ? "TEMPLATE" : target.nodeName
        );
      this.t = target.tagName !== "TEMPLATE" ? target : (
        /** @type {HTMLTemplateElement} */
        target.content
      );
      this.c(html);
    }
    this.i(anchor);
  }
  /**
   * @param {string} html
   * @returns {void}
   */
  h(html) {
    this.e.innerHTML = html;
    this.n = Array.from(
      this.e.nodeName === "TEMPLATE" ? this.e.content.childNodes : this.e.childNodes
    );
  }
  /**
   * @returns {void} */
  i(anchor) {
    for (let i = 0; i < this.n.length; i += 1) {
      insert(this.t, this.n[i], anchor);
    }
  }
  /**
   * @param {string} html
   * @returns {void}
   */
  p(html) {
    this.d();
    this.h(html);
    this.i(this.a);
  }
  /**
   * @returns {void} */
  d() {
    this.n.forEach(detach);
  }
}
const managed_styles = /* @__PURE__ */ new Map();
let active = 0;
function hash(str) {
  let hash2 = 5381;
  let i = str.length;
  while (i--) hash2 = (hash2 << 5) - hash2 ^ str.charCodeAt(i);
  return hash2 >>> 0;
}
function create_style_information(doc, node) {
  const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
  managed_styles.set(doc, info);
  return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
  const step = 16.666 / duration;
  let keyframes = "{\n";
  for (let p = 0; p <= 1; p += step) {
    const t = a + (b - a) * ease(p);
    keyframes += p * 100 + `%{${fn(t, 1 - t)}}
`;
  }
  const rule = keyframes + `100% {${fn(b, 1 - b)}}
}`;
  const name = `__svelte_${hash(rule)}_${uid}`;
  const doc = get_root_for_style(node);
  const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
  if (!rules[name]) {
    rules[name] = true;
    stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
  }
  const animation = node.style.animation || "";
  node.style.animation = `${animation ? `${animation}, ` : ""}${name} ${duration}ms linear ${delay}ms 1 both`;
  active += 1;
  return name;
}
function delete_rule(node, name) {
  const previous = (node.style.animation || "").split(", ");
  const next = previous.filter(
    name ? (anim) => anim.indexOf(name) < 0 : (anim) => anim.indexOf("__svelte") === -1
    // remove all Svelte animations
  );
  const deleted = previous.length - next.length;
  if (deleted) {
    node.style.animation = next.join(", ");
    active -= deleted;
    if (!active) clear_rules();
  }
}
function clear_rules() {
  raf(() => {
    if (active) return;
    managed_styles.forEach((info) => {
      const { ownerNode } = info.stylesheet;
      if (ownerNode) detach(ownerNode);
    });
    managed_styles.clear();
  });
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component) throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
  get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
  const component = get_current_component();
  return (type, detail, { cancelable = false } = {}) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(
        /** @type {string} */
        type,
        detail,
        { cancelable }
      );
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
      return !event.defaultPrevented;
    }
    return true;
  };
}
const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
function add_flush_callback(fn) {
  flush_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length) binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function flush_render_callbacks(fns) {
  const filtered = [];
  const targets = [];
  render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
  targets.forEach((c) => c());
  render_callbacks = filtered;
}
let promise;
function wait() {
  if (!promise) {
    promise = Promise.resolve();
    promise.then(() => {
      promise = null;
    });
  }
  return promise;
}
function dispatch(node, direction, kind) {
  node.dispatchEvent(custom_event(`${direction ? "intro" : "outro"}${kind}`));
}
const outroing = /* @__PURE__ */ new Set();
let outros;
function group_outros() {
  outros = {
    r: 0,
    c: [],
    p: outros
    // parent group
  };
}
function check_outros() {
  if (!outros.r) {
    run_all(outros.c);
  }
  outros = outros.p;
}
function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}
function transition_out(block, local, detach2, callback) {
  if (block && block.o) {
    if (outroing.has(block)) return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);
      if (callback) {
        if (detach2) block.d(1);
        callback();
      }
    });
    block.o(local);
  } else if (callback) {
    callback();
  }
}
const null_transition = { duration: 0 };
function create_bidirectional_transition(node, fn, params2, intro) {
  const options = { direction: "both" };
  let config = fn(node, params2, options);
  let t = intro ? 0 : 1;
  let running_program = null;
  let pending_program = null;
  let animation_name = null;
  let original_inert_value;
  function clear_animation() {
    if (animation_name) delete_rule(node, animation_name);
  }
  function init2(program, duration) {
    const d = (
      /** @type {Program['d']} */
      program.b - t
    );
    duration *= Math.abs(d);
    return {
      a: t,
      b: program.b,
      d,
      duration,
      start: program.start,
      end: program.start + duration,
      group: program.group
    };
  }
  function go(b) {
    const {
      delay = 0,
      duration = 300,
      easing = identity,
      tick = noop$1,
      css
    } = config || null_transition;
    const program = {
      start: now() + delay,
      b
    };
    if (!b) {
      program.group = outros;
      outros.r += 1;
    }
    if ("inert" in node) {
      if (b) {
        if (original_inert_value !== void 0) {
          node.inert = original_inert_value;
        }
      } else {
        original_inert_value = /** @type {HTMLElement} */
        node.inert;
        node.inert = true;
      }
    }
    if (running_program || pending_program) {
      pending_program = program;
    } else {
      if (css) {
        clear_animation();
        animation_name = create_rule(node, t, b, duration, delay, easing, css);
      }
      if (b) tick(0, 1);
      running_program = init2(program, duration);
      add_render_callback(() => dispatch(node, b, "start"));
      loop((now2) => {
        if (pending_program && now2 > pending_program.start) {
          running_program = init2(pending_program, duration);
          pending_program = null;
          dispatch(node, running_program.b, "start");
          if (css) {
            clear_animation();
            animation_name = create_rule(
              node,
              t,
              running_program.b,
              running_program.duration,
              0,
              easing,
              config.css
            );
          }
        }
        if (running_program) {
          if (now2 >= running_program.end) {
            tick(t = running_program.b, 1 - t);
            dispatch(node, running_program.b, "end");
            if (!pending_program) {
              if (running_program.b) {
                clear_animation();
              } else {
                if (!--running_program.group.r) run_all(running_program.group.c);
              }
            }
            running_program = null;
          } else if (now2 >= running_program.start) {
            const p = now2 - running_program.start;
            t = running_program.a + running_program.d * easing(p / running_program.duration);
            tick(t, 1 - t);
          }
        }
        return !!(running_program || pending_program);
      });
    }
  }
  return {
    run(b) {
      if (is_function(config)) {
        wait().then(() => {
          const opts = { direction: b ? "in" : "out" };
          config = config(opts);
          go(b);
        });
      } else {
        go(b);
      }
    },
    end() {
      clear_animation();
      running_program = pending_program = null;
    }
  };
}
function ensure_array_like(array_like_or_iterator) {
  return (array_like_or_iterator == null ? void 0 : array_like_or_iterator.length) !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
}
function outro_and_destroy_block(block, lookup) {
  transition_out(block, 1, 1, () => {
    lookup.delete(block.key);
  });
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block2, next, get_context) {
  let o = old_blocks.length;
  let n = list.length;
  let i = o;
  const old_indexes = {};
  while (i--) old_indexes[old_blocks[i].key] = i;
  const new_blocks = [];
  const new_lookup = /* @__PURE__ */ new Map();
  const deltas = /* @__PURE__ */ new Map();
  const updates = [];
  i = n;
  while (i--) {
    const child_ctx = get_context(ctx, list, i);
    const key = get_key(child_ctx);
    let block = lookup.get(key);
    if (!block) {
      block = create_each_block2(key, child_ctx);
      block.c();
    } else {
      updates.push(() => block.p(child_ctx, dirty));
    }
    new_lookup.set(key, new_blocks[i] = block);
    if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
  }
  const will_move = /* @__PURE__ */ new Set();
  const did_move = /* @__PURE__ */ new Set();
  function insert2(block) {
    transition_in(block, 1);
    block.m(node, next);
    lookup.set(block.key, block);
    next = block.first;
    n--;
  }
  while (o && n) {
    const new_block = new_blocks[n - 1];
    const old_block = old_blocks[o - 1];
    const new_key = new_block.key;
    const old_key = old_block.key;
    if (new_block === old_block) {
      next = new_block.first;
      o--;
      n--;
    } else if (!new_lookup.has(old_key)) {
      destroy(old_block, lookup);
      o--;
    } else if (!lookup.has(new_key) || will_move.has(new_key)) {
      insert2(new_block);
    } else if (did_move.has(old_key)) {
      o--;
    } else if (deltas.get(new_key) > deltas.get(old_key)) {
      did_move.add(new_key);
      insert2(new_block);
    } else {
      will_move.add(old_key);
      o--;
    }
  }
  while (o--) {
    const old_block = old_blocks[o];
    if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
  }
  while (n) insert2(new_blocks[n - 1]);
  run_all(updates);
  return new_blocks;
}
function bind$1(component, name, callback) {
  const index = component.$$.props[name];
  if (index !== void 0) {
    component.$$.bound[index] = callback;
    callback(component.$$.ctx[index]);
  }
}
function create_component(block) {
  block && block.c();
}
function mount_component(component, target, anchor) {
  const { fragment, after_update } = component.$$;
  fragment && fragment.m(target, anchor);
  add_render_callback(() => {
    const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
    if (component.$$.on_destroy) {
      component.$$.on_destroy.push(...new_on_destroy);
    } else {
      run_all(new_on_destroy);
    }
    component.$$.on_mount = [];
  });
  after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    flush_render_callbacks($$.after_update);
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
function make_dirty(component, i) {
  if (component.$$.dirty[0] === -1) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty.fill(0);
  }
  component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
}
function init(component, options, instance2, create_fragment2, not_equal, props, append_styles = null, dirty = [-1]) {
  const parent_component = current_component;
  set_current_component(component);
  const $$ = component.$$ = {
    fragment: null,
    ctx: [],
    // state
    props,
    update: noop$1,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
    // everything else
    callbacks: blank_object(),
    dirty,
    skip_bound: false,
    root: options.target || parent_component.$$.root
  };
  append_styles && append_styles($$.root);
  let ready = false;
  $$.ctx = instance2 ? instance2(component, options.props || {}, (i, ret, ...rest) => {
    const value = rest.length ? rest[0] : ret;
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
      if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
      if (ready) make_dirty(component, i);
    }
    return ret;
  }) : [];
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment2 ? create_fragment2($$.ctx) : false;
  if (options.target) {
    if (options.hydrate) {
      const nodes = children(options.target);
      $$.fragment && $$.fragment.l(nodes);
      nodes.forEach(detach);
    } else {
      $$.fragment && $$.fragment.c();
    }
    if (options.intro) transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor);
    flush();
  }
  set_current_component(parent_component);
}
class SvelteComponent {
  constructor() {
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    __publicField(this, "$$");
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    __publicField(this, "$$set");
  }
  /** @returns {void} */
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop$1;
  }
  /**
   * @template {Extract<keyof Events, string>} K
   * @param {K} type
   * @param {((e: Events[K]) => void) | null | undefined} callback
   * @returns {() => void}
   */
  $on(type, callback) {
    if (!is_function(callback)) {
      return noop$1;
    }
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }
  /**
   * @param {Partial<Props>} props
   * @returns {void}
   */
  $set(props) {
    if (this.$$set && !is_empty(props)) {
      this.$$.skip_bound = true;
      this.$$set(props);
      this.$$.skip_bound = false;
    }
  }
}
const PUBLIC_VERSION = "4";
if (typeof window !== "undefined")
  (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(PUBLIC_VERSION);
function getMeta$1(metaName) {
  const metas = document.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    if (metas[i].getAttribute("name") === metaName) {
      return metas[i].getAttribute("content");
    }
  }
  return "";
}
function create_fragment$d(ctx) {
  let span;
  return {
    c() {
      span = element("span");
      span.textContent = `${/*invisible*/
      ctx[0]}`;
      attr(span, "class", "spaces svelte-g8kv7q");
    },
    m(target, anchor) {
      insert(target, span, anchor);
    },
    p: noop$1,
    i: noop$1,
    o: noop$1,
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function instance$d($$self, $$props, $$invalidate) {
  let { w = 10 } = $$props;
  let invisible = "-".repeat(w);
  $$self.$$set = ($$props2) => {
    if ("w" in $$props2) $$invalidate(1, w = $$props2.w);
  };
  return [invisible, w];
}
class Separator extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$d, create_fragment$d, safe_not_equal, { w: 1 });
  }
}
const dummyJobs = [
  {
    "id": "2547607",
    "age": "0:18",
    "nodes": "csr1b01n23",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:34:38",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2547606",
    "age": "0:35",
    "nodes": "csr1b01n19",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:34:19",
    "command": " xxxx ",
    "account": "homologa",
    "name": "base_Sepia_V5_P10.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2547604",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "/apps2/CMG/RunSim.sh gem 2019.12 /dfs_geral_ep/res/usuarios/x0gd/simuls/2023-01-10_v5_0_821bff15/base/Sepia_V5.dat -wd /dfs_geral_ep/res/usuarios/x0gd/simuls/2023-01-10_v5_0_821bff15/base -wait -parasol 40 -log -cputime -doms",
    "account": "homologa",
    "name": "base_Sepia_V5.dat.821bff15",
    user: "x9fd"
  },
  {
    "id": "2547603",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "atp-ro",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "cmyz"
  },
  {
    "id": "2546999",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "bmfe"
  },
  {
    "id": "2546998",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546997",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546996",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546995",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546994",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546993",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546992",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546991",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546989",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546988",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546987",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546986",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546985",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546984",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546983",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546982",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  },
  {
    "id": "2546981",
    "age": "1:06",
    "nodes": "csr1b01n15",
    "partition": "pos",
    "state": "RUNNING",
    "startTime": "2023-01-31T09:33:50",
    "command": "xxxxx",
    "account": "homologa",
    "name": "otim_Sepia_V5_P90.dat.821bff15",
    user: "x0gd"
  }
];
async function mockPostMessage(message) {
  const command = message.command;
  const payload = message.payload;
  switch (command) {
    case "listJobs":
      console.log("List jobs chegou no mockOnDidReceiver");
      _askForJobs(payload);
      break;
  }
  async function _askForJobs(payload2) {
    console.log(JSON.stringify(payload2));
    let ret = dummyJobs;
    if (ret.length > 0) {
      console.log("Despachando os jobs de teste");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("message", {
          bubbles: true,
          detail: { "message": "jobs", "payload": ret }
        }));
      }, 1e3);
    } else {
      setTimeout(() => {
        console.log("Retornado evento para webview informando não ter chegado jobs válidos");
        window.dispatchEvent(new CustomEvent("message", {
          bubbles: false,
          detail: { "message": "info", "payload": "Nenhum job encontrado!", extra: "noJobs" }
        }));
      }, 1e3);
    }
  }
}
class VSCodeAPIWrapper {
  constructor() {
    __publicField(this, "vsCodeApi");
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }
  /**
   * Post a message (i.e. send arbitrary data) to the owner of the webview.
   *
   * @remarks When running webview code inside a web browser, postMessage will instead
   * (log the given message to the console) não mais!.
   * Se não tiver rodando num browser ele vai chamar o mockPostMessage em direção
   * ao gerenciador de dados de teste ligado ao evento. Veja o mockPostMessage.
   *
   * @param message Abitrary data (must be JSON serializable) to send to the extension context.
   */
  postMessage(message) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      mockPostMessage(message);
    }
  }
  /**
   * Get the persistent state stored for this webview.
   *
   * @remarks When running webview source code inside a web browser, getState will retrieve state
   * from local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   *
   * @return The current state or `undefined` if no state has been set.
   */
  getState() {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    } else {
      const state = localStorage.getItem("vscodeState");
      return state ? JSON.parse(state) : void 0;
    }
  }
  /**
   * Set the persistent state stored for this webview.
   *
   * @remarks When running webview source code inside a web browser, setState will set the given
   * state using local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   *
   * @param newState New persisted state. This must be a JSON serializable object. Can be retrieved
   * using {@link getState}.
   *
   * @return The new state.
   */
  setState(newState) {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    } else {
      localStorage.setItem("vscodeState", JSON.stringify(newState));
      return newState;
    }
  }
}
const vscode = new VSCodeAPIWrapper();
function cubicOut(t) {
  const f = t - 1;
  return f * f * f + 1;
}
function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
  const o = +getComputedStyle(node).opacity;
  return {
    delay,
    duration,
    easing,
    css: (t) => `opacity: ${t * o}`
  };
}
function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
  const style = getComputedStyle(node);
  const target_opacity = +style.opacity;
  const transform = style.transform === "none" ? "" : style.transform;
  const od = target_opacity * (1 - opacity);
  const [xValue, xUnit] = split_css_unit(x);
  const [yValue, yUnit] = split_css_unit(y);
  return {
    delay,
    duration,
    easing,
    css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - od * u}`
  };
}
function create_fragment$c(ctx) {
  let svg;
  let path;
  return {
    c() {
      svg = svg_element("svg");
      path = svg_element("path");
      attr(path, "fill", "currentColor");
      attr(path, "d", "M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 464c-118.664 0-216-96.055-216-216 0-118.663 96.055-216 216-216 118.664 0 216 96.055 216 216 0 118.663-96.055 216-216 216zm141.63-274.961L217.15 376.071c-4.705 4.667-12.303 4.637-16.97-.068l-85.878-86.572c-4.667-4.705-4.637-12.303.068-16.97l8.52-8.451c4.705-4.667 12.303-4.637 16.97.068l68.976 69.533 163.441-162.13c4.705-4.667 12.303-4.637 16.97.068l8.451 8.52c4.668 4.705 4.637 12.303-.068 16.97z");
      attr(
        svg,
        "width",
        /*width*/
        ctx[0]
      );
      set_style(svg, "text-align", "center");
      set_style(svg, "display", "inline-block");
      attr(svg, "aria-hidden", "true");
      attr(svg, "focusable", "false");
      attr(svg, "role", "img");
      attr(svg, "xmlns", "http://www.w3.org/2000/svg");
      attr(svg, "viewBox", "0 0 512 512");
    },
    m(target, anchor) {
      insert(target, svg, anchor);
      append(svg, path);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*width*/
      1) {
        attr(
          svg,
          "width",
          /*width*/
          ctx2[0]
        );
      }
    },
    i: noop$1,
    o: noop$1,
    d(detaching) {
      if (detaching) {
        detach(svg);
      }
    }
  };
}
function instance$c($$self, $$props, $$invalidate) {
  let { width = "1em" } = $$props;
  $$self.$$set = ($$props2) => {
    if ("width" in $$props2) $$invalidate(0, width = $$props2.width);
  };
  return [width];
}
class Success extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$c, create_fragment$c, safe_not_equal, { width: 0 });
  }
}
function create_fragment$b(ctx) {
  let svg;
  let path;
  return {
    c() {
      svg = svg_element("svg");
      path = svg_element("path");
      attr(path, "fill", "currentColor");
      attr(path, "d", "M256 40c118.621 0 216 96.075 216 216 0 119.291-96.61 216-216 216-119.244 0-216-96.562-216-216 0-119.203 96.602-216 216-216m0-32C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm-11.49 120h22.979c6.823 0 12.274 5.682 11.99 12.5l-7 168c-.268 6.428-5.556 11.5-11.99 11.5h-8.979c-6.433 0-11.722-5.073-11.99-11.5l-7-168c-.283-6.818 5.167-12.5 11.99-12.5zM256 340c-15.464 0-28 12.536-28 28s12.536 28 28 28 28-12.536 28-28-12.536-28-28-28z");
      attr(path, "class", "");
      attr(
        svg,
        "width",
        /*width*/
        ctx[0]
      );
      set_style(svg, "text-align", "center");
      set_style(svg, "display", "inline-block");
      attr(svg, "aria-hidden", "true");
      attr(svg, "focusable", "false");
      attr(svg, "role", "img");
      attr(svg, "xmlns", "http://www.w3.org/2000/svg");
      attr(svg, "viewBox", "0 0 512 512");
    },
    m(target, anchor) {
      insert(target, svg, anchor);
      append(svg, path);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*width*/
      1) {
        attr(
          svg,
          "width",
          /*width*/
          ctx2[0]
        );
      }
    },
    i: noop$1,
    o: noop$1,
    d(detaching) {
      if (detaching) {
        detach(svg);
      }
    }
  };
}
function instance$b($$self, $$props, $$invalidate) {
  let { width = "1em" } = $$props;
  $$self.$$set = ($$props2) => {
    if ("width" in $$props2) $$invalidate(0, width = $$props2.width);
  };
  return [width];
}
let Error$1 = class Error2 extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$b, create_fragment$b, safe_not_equal, { width: 0 });
  }
};
function create_fragment$a(ctx) {
  let svg;
  let path;
  return {
    c() {
      svg = svg_element("svg");
      path = svg_element("path");
      attr(path, "fill", "currentColor");
      attr(path, "d", "M256 40c118.621 0 216 96.075 216 216 0 119.291-96.61 216-216 216-119.244 0-216-96.562-216-216 0-119.203 96.602-216 216-216m0-32C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm-36 344h12V232h-12c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12h48c6.627 0 12 5.373 12 12v140h12c6.627 0 12 5.373 12 12v8c0 6.627-5.373 12-12 12h-72c-6.627 0-12-5.373-12-12v-8c0-6.627 5.373-12 12-12zm36-240c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32z");
      attr(
        svg,
        "width",
        /*width*/
        ctx[0]
      );
      set_style(svg, "text-align", "center");
      set_style(svg, "display", "inline-block");
      attr(svg, "aria-hidden", "true");
      attr(svg, "focusable", "false");
      attr(svg, "role", "img");
      attr(svg, "xmlns", "http://www.w3.org/2000/svg");
      attr(svg, "viewBox", "0 0 512 512");
    },
    m(target, anchor) {
      insert(target, svg, anchor);
      append(svg, path);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*width*/
      1) {
        attr(
          svg,
          "width",
          /*width*/
          ctx2[0]
        );
      }
    },
    i: noop$1,
    o: noop$1,
    d(detaching) {
      if (detaching) {
        detach(svg);
      }
    }
  };
}
function instance$a($$self, $$props, $$invalidate) {
  let { width = "1em" } = $$props;
  $$self.$$set = ($$props2) => {
    if ("width" in $$props2) $$invalidate(0, width = $$props2.width);
  };
  return [width];
}
class Info extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$a, create_fragment$a, safe_not_equal, { width: 0 });
  }
}
function create_fragment$9(ctx) {
  let svg;
  let path;
  return {
    c() {
      svg = svg_element("svg");
      path = svg_element("path");
      attr(path, "fill", "currentColor");
      attr(path, "d", "M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z");
      attr(
        svg,
        "width",
        /*width*/
        ctx[0]
      );
      set_style(svg, "text-align", "center");
      set_style(svg, "display", "inline-block");
      attr(svg, "aria-hidden", "true");
      attr(svg, "focusable", "false");
      attr(svg, "role", "img");
      attr(svg, "xmlns", "http://www.w3.org/2000/svg");
      attr(svg, "viewBox", "0 0 352 512");
    },
    m(target, anchor) {
      insert(target, svg, anchor);
      append(svg, path);
    },
    p(ctx2, [dirty]) {
      if (dirty & /*width*/
      1) {
        attr(
          svg,
          "width",
          /*width*/
          ctx2[0]
        );
      }
    },
    i: noop$1,
    o: noop$1,
    d(detaching) {
      if (detaching) {
        detach(svg);
      }
    }
  };
}
function instance$9($$self, $$props, $$invalidate) {
  let { width = "1em" } = $$props;
  $$self.$$set = ($$props2) => {
    if ("width" in $$props2) $$invalidate(0, width = $$props2.width);
  };
  return [width];
}
class Close extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$9, create_fragment$9, safe_not_equal, { width: 0 });
  }
}
function create_else_block$4(ctx) {
  let infoicon;
  let current;
  infoicon = new Info({ props: { width: "1.1em" } });
  return {
    c() {
      create_component(infoicon.$$.fragment);
    },
    m(target, anchor) {
      mount_component(infoicon, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(infoicon.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(infoicon.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(infoicon, detaching);
    }
  };
}
function create_if_block_2$2(ctx) {
  let erroricon;
  let current;
  erroricon = new Error$1({ props: { width: "1.1em" } });
  return {
    c() {
      create_component(erroricon.$$.fragment);
    },
    m(target, anchor) {
      mount_component(erroricon, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(erroricon.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(erroricon.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(erroricon, detaching);
    }
  };
}
function create_if_block_1$4(ctx) {
  let successicon;
  let current;
  successicon = new Success({ props: { width: "1.1em" } });
  return {
    c() {
      create_component(successicon.$$.fragment);
    },
    m(target, anchor) {
      mount_component(successicon, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(successicon.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(successicon.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(successicon, detaching);
    }
  };
}
function create_if_block$7(ctx) {
  let button;
  let closeicon;
  let current;
  let mounted;
  let dispose;
  closeicon = new Close({ props: { width: "0.8em" } });
  return {
    c() {
      button = element("button");
      create_component(closeicon.$$.fragment);
      attr(button, "class", "close svelte-tp2z8e");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      mount_component(closeicon, button, null);
      current = true;
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler*/
          ctx[5]
        );
        mounted = true;
      }
    },
    p: noop$1,
    i(local) {
      if (current) return;
      transition_in(closeicon.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(closeicon.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      destroy_component(closeicon);
      mounted = false;
      dispose();
    }
  };
}
function create_fragment$8(ctx) {
  let article;
  let current_block_type_index;
  let if_block0;
  let t0;
  let div;
  let t1;
  let article_class_value;
  let article_transition;
  let current;
  const if_block_creators = [create_if_block_1$4, create_if_block_2$2, create_else_block$4];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*type*/
      ctx2[0] === "success"
    ) return 0;
    if (
      /*type*/
      ctx2[0] === "error"
    ) return 1;
    return 2;
  }
  current_block_type_index = select_block_type(ctx);
  if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  const default_slot_template = (
    /*#slots*/
    ctx[4].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[3],
    null
  );
  let if_block1 = (
    /*dismissible*/
    ctx[1] && create_if_block$7(ctx)
  );
  return {
    c() {
      article = element("article");
      if_block0.c();
      t0 = space();
      div = element("div");
      if (default_slot) default_slot.c();
      t1 = space();
      if (if_block1) if_block1.c();
      attr(div, "class", "text svelte-tp2z8e");
      attr(article, "class", article_class_value = null_to_empty(
        /*type*/
        ctx[0]
      ) + " svelte-tp2z8e");
      attr(article, "role", "alert");
    },
    m(target, anchor) {
      insert(target, article, anchor);
      if_blocks[current_block_type_index].m(article, null);
      append(article, t0);
      append(article, div);
      if (default_slot) {
        default_slot.m(div, null);
      }
      append(article, t1);
      if (if_block1) if_block1.m(article, null);
      current = true;
    },
    p(ctx2, [dirty]) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index !== previous_block_index) {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block0 = if_blocks[current_block_type_index];
        if (!if_block0) {
          if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block0.c();
        }
        transition_in(if_block0, 1);
        if_block0.m(article, t0);
      }
      if (default_slot) {
        if (default_slot.p && (!current || dirty & /*$$scope*/
        8)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[3],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[3]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx2[3],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (
        /*dismissible*/
        ctx2[1]
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
          if (dirty & /*dismissible*/
          2) {
            transition_in(if_block1, 1);
          }
        } else {
          if_block1 = create_if_block$7(ctx2);
          if_block1.c();
          transition_in(if_block1, 1);
          if_block1.m(article, null);
        }
      } else if (if_block1) {
        group_outros();
        transition_out(if_block1, 1, 1, () => {
          if_block1 = null;
        });
        check_outros();
      }
      if (!current || dirty & /*type*/
      1 && article_class_value !== (article_class_value = null_to_empty(
        /*type*/
        ctx2[0]
      ) + " svelte-tp2z8e")) {
        attr(article, "class", article_class_value);
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block0);
      transition_in(default_slot, local);
      transition_in(if_block1);
      if (local) {
        add_render_callback(() => {
          if (!current) return;
          if (!article_transition) article_transition = create_bidirectional_transition(article, fade, {}, true);
          article_transition.run(1);
        });
      }
      current = true;
    },
    o(local) {
      transition_out(if_block0);
      transition_out(default_slot, local);
      transition_out(if_block1);
      if (local) {
        if (!article_transition) article_transition = create_bidirectional_transition(article, fade, {}, false);
        article_transition.run(0);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(article);
      }
      if_blocks[current_block_type_index].d();
      if (default_slot) default_slot.d(detaching);
      if (if_block1) if_block1.d();
      if (detaching && article_transition) article_transition.end();
    }
  };
}
function instance$8($$self, $$props, $$invalidate) {
  let { $$slots: slots = {}, $$scope } = $$props;
  const dispatch2 = createEventDispatcher();
  let { type = "error" } = $$props;
  let { dismissible = true } = $$props;
  const click_handler = () => dispatch2("dismiss");
  $$self.$$set = ($$props2) => {
    if ("type" in $$props2) $$invalidate(0, type = $$props2.type);
    if ("dismissible" in $$props2) $$invalidate(1, dismissible = $$props2.dismissible);
    if ("$$scope" in $$props2) $$invalidate(3, $$scope = $$props2.$$scope);
  };
  return [type, dismissible, dispatch2, $$scope, slots, click_handler];
}
class Toast extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$8, create_fragment$8, safe_not_equal, { type: 0, dismissible: 1 });
  }
}
const subscriber_queue = [];
function writable(value, start = noop$1) {
  let stop;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set, update2) || noop$1;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update: update2, subscribe: subscribe2 };
}
const toasts = writable([]);
const dismissToast = (id) => {
  toasts.update((all2) => all2.filter((t) => t.id !== id));
};
const clearToasts = () => {
  toasts.set([]);
};
function get_each_context$3(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[2] = list[i];
  return child_ctx;
}
function create_if_block$6(ctx) {
  let section;
  let each_blocks = [];
  let each_1_lookup = /* @__PURE__ */ new Map();
  let current;
  let each_value = ensure_array_like(
    /*$toasts*/
    ctx[0]
  );
  const get_key = (ctx2) => (
    /*toast*/
    ctx2[2].id
  );
  for (let i = 0; i < each_value.length; i += 1) {
    let child_ctx = get_each_context$3(ctx, each_value, i);
    let key = get_key(child_ctx);
    each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
  }
  return {
    c() {
      section = element("section");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(section, "class", "svelte-12nsxuf");
    },
    m(target, anchor) {
      insert(target, section, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(section, null);
        }
      }
      current = true;
    },
    p(ctx2, dirty) {
      if (dirty & /*$toasts*/
      1) {
        each_value = ensure_array_like(
          /*$toasts*/
          ctx2[0]
        );
        group_outros();
        each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx2, each_value, each_1_lookup, section, outro_and_destroy_block, create_each_block$3, null, get_each_context$3);
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(section);
      }
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].d();
      }
    }
  };
}
function create_default_slot$2(ctx) {
  let t_value = (
    /*toast*/
    ctx[2].message + ""
  );
  let t;
  return {
    c() {
      t = text(t_value);
    },
    m(target, anchor) {
      insert(target, t, anchor);
    },
    p(ctx2, dirty) {
      if (dirty & /*$toasts*/
      1 && t_value !== (t_value = /*toast*/
      ctx2[2].message + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(t);
      }
    }
  };
}
function create_each_block$3(key_1, ctx) {
  let first;
  let toast_1;
  let current;
  function dismiss_handler() {
    return (
      /*dismiss_handler*/
      ctx[1](
        /*toast*/
        ctx[2]
      )
    );
  }
  toast_1 = new Toast({
    props: {
      type: (
        /*toast*/
        ctx[2].type
      ),
      dismissible: (
        /*toast*/
        ctx[2].dismissible
      ),
      $$slots: { default: [create_default_slot$2] },
      $$scope: { ctx }
    }
  });
  toast_1.$on("dismiss", dismiss_handler);
  return {
    key: key_1,
    first: null,
    c() {
      first = empty();
      create_component(toast_1.$$.fragment);
      this.first = first;
    },
    m(target, anchor) {
      insert(target, first, anchor);
      mount_component(toast_1, target, anchor);
      current = true;
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      const toast_1_changes = {};
      if (dirty & /*$toasts*/
      1) toast_1_changes.type = /*toast*/
      ctx[2].type;
      if (dirty & /*$toasts*/
      1) toast_1_changes.dismissible = /*toast*/
      ctx[2].dismissible;
      if (dirty & /*$$scope, $toasts*/
      33) {
        toast_1_changes.$$scope = { dirty, ctx };
      }
      toast_1.$set(toast_1_changes);
    },
    i(local) {
      if (current) return;
      transition_in(toast_1.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(toast_1.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(first);
      }
      destroy_component(toast_1, detaching);
    }
  };
}
function create_fragment$7(ctx) {
  let if_block_anchor;
  let current;
  let if_block = (
    /*$toasts*/
    ctx[0] && create_if_block$6(ctx)
  );
  return {
    c() {
      if (if_block) if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if (if_block) if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (
        /*$toasts*/
        ctx2[0]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*$toasts*/
          1) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block$6(ctx2);
          if_block.c();
          transition_in(if_block, 1);
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      } else if (if_block) {
        group_outros();
        transition_out(if_block, 1, 1, () => {
          if_block = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if (if_block) if_block.d(detaching);
    }
  };
}
function instance$7($$self, $$props, $$invalidate) {
  let $toasts;
  component_subscribe($$self, toasts, ($$value) => $$invalidate(0, $toasts = $$value));
  const dismiss_handler = (toast) => dismissToast(toast.id);
  return [$toasts, dismiss_handler];
}
class Toasts extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$7, create_fragment$7, safe_not_equal, {});
  }
}
const convertISODate2LocalTime = (dateStr) => {
  const date = /* @__PURE__ */ new Date(dateStr + "+03:00");
  return date.toISOString().toLocaleString().split("T")[0] + " " + date.toISOString().toLocaleString().split("T")[1].split(".")[0];
};
const converSlurmTime2Short = (dateStr) => {
  let m = dateStr.match(/^(\d+)-(\d+):(\d+):(\d+)$/);
  if (m) {
    let ret = Number(m[1]) + Math.round(Number(m[2]) * 100) / 2400;
    Math.round(Number(m[3]) * 100) / 24 * 6e3;
    ret = Math.floor(ret * 10) / 10;
    return ret + " d";
  }
  m = dateStr.match(/^(\d+):(\d+):(\d+)$/);
  if (m) {
    let ret = Number(m[1]) + Number(m[2]) / 60;
    Number(m[3]) / (60 * 60);
    ret = Math.floor(ret * 10) / 10;
    return ret + " h";
  }
  m = dateStr.match(/^(\d+):(\d+)$/);
  if (m) {
    let ret = Number(m[1]) + Number(m[2]) / 60;
    ret = Math.floor(ret * 10) / 10;
    return ret + " min";
  }
  m = dateStr.match(/^(\d+)$/);
  if (m) {
    return m[0] + " s";
  }
  return "Erro!";
};
const convertSeconds2Short = (t) => {
  const secs = t;
  if (secs >= 0 && secs < 60) {
    return secs.toString() + " s";
  }
  if (secs >= 60 && secs < 3600) {
    return (Math.round(secs * 10 / 60) / 10).toString() + " min";
  }
  if (secs >= 3600 && secs < 86400) {
    return (Math.round(secs * 10 / 3600) / 10).toString() + " h";
  }
  if (secs >= 86400) {
    return (Math.round(secs * 10 / (3600 * 24)) / 10).toString() + " d";
  }
  return "0";
};
const jobInfoOrder = [
  "id",
  "name",
  "state",
  "age",
  "startTime",
  "queue_wait",
  "nodes",
  "cores",
  "cluster",
  "user",
  "account",
  "partition",
  "command",
  "work_dir",
  "qos"
];
const convertJobKeyName = (value) => {
  const translation = {
    "id": "ID",
    "name": "Nome do Job",
    "state": "Ultima situação",
    "age": "Idade",
    "startTime": "Data de Submissão",
    "nodes": "Nós",
    "cores": "Núcleos(cores)",
    "cluster": "cluster",
    "user": "Usuário",
    "account": "Account",
    "partition": "Fila",
    "command": "Comando enviado",
    "work_dir": "Área de Trabalho",
    "queue_wait": "Tempo na fila"
  };
  if (`${value}` in translation) {
    return translation[value];
  }
  return "?";
};
const histInfoOrder = [
  "jobid",
  "job_name",
  "state",
  ,
  "elapsed",
  "@submit",
  "nodes",
  "cpus_per_task",
  "cluster",
  "username",
  "account",
  "partition",
  "work_dir",
  "command",
  "queue_wait"
];
const converHistKeyName = (value) => {
  const translation = {
    "jobid": "ID",
    "job_name": "Nome do Job",
    "state": "Ultima situação",
    "elapsed": "Tempo",
    "@submit": "Data de submissão",
    "nodes": "Nós",
    "cpus_per_task": "Núcleos(cores)",
    "cluster": "Cluster",
    "username": "Usuário",
    "account": "Account",
    "partition": "Fila",
    "command": "Comando",
    "work_dir": "Área de Trabalho",
    "queue_wait": "Tempo na fila"
  };
  if (`${value}` in translation) {
    return translation[value];
  }
  return "?";
};
const formatValue = (key, value) => {
  if (key === "startTime" || key === "@submit") {
    return convertISODate2LocalTime(value);
  }
  if (key === "elapsed") {
    return convertSeconds2Short(Number(value));
  }
  if (value === void 0) {
    return "Valor não disponível para esta visão";
  }
  if (key === "queue_wait") {
    return convertSeconds2Short(Number(value));
  }
  return value;
};
function getMeta(metaName) {
  const metas = document.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    if (metas[i].getAttribute("name") === metaName) {
      return metas[i].getAttribute("content");
    }
  }
  return "";
}
const accounts = [
  "3dsl",
  "aaspi",
  "abaqus",
  "acfc",
  "acfc-ne",
  "acfc-nw",
  "andorinha",
  "arc",
  "arz",
  "atp-ab",
  "atp-abl",
  "atp-brc",
  "atp-buz",
  "atp-jub-cht",
  "atp-lula",
  "atp-mll",
  "atp-mls",
  "atp-mrl",
  "atp-psmg",
  "atp-ro",
  "atp-ssu",
  "avaliacao",
  "barra",
  "bc-atp-s",
  "bmc33",
  "brava",
  "brigadeiro",
  "buena_suerte",
  "buzios",
  "carcara",
  "ccus_merluza_lagosta",
  "cenpes",
  "cernambi",
  "cmg",
  "cnc",
  "cumbe",
  "cup-crp",
  "di",
  "dnd",
  "ehm",
  "engper",
  "equinor-ro",
  "espadarte",
  "fal",
  "farfan",
  "florim",
  "fuji",
  "geomec",
  "gger",
  "gralha_azul",
  "guara",
  "him",
  "homologa",
  "iara",
  "icaro",
  "incorpora",
  "indra",
  "infra",
  "itapu",
  "itapu_bs",
  "ix",
  "jupiter",
  "lapa",
  "libra",
  "luc",
  "lula",
  "mairare",
  "maromba",
  "moita_bonita",
  "monai",
  "mopane",
  "morpho",
  "muriu",
  "naru",
  "ne_tupi",
  "opal",
  "opr",
  "orca",
  "petrel",
  "pgpe",
  "pitu",
  "planmeq",
  "poco_verde",
  "ppsa",
  "presal",
  "quindim",
  "reserva_ecl",
  "rev_albacora",
  "rev_marlim",
  "ruc",
  "sao_bernardo",
  "sapinhoa",
  "scap3",
  "seap",
  "sepia_bs",
  "suc",
  "tambau_urugua",
  "tambuata",
  "tartarugas",
  "tay",
  "tucano",
  "unrnce",
  "unseal",
  "uoba",
  "uornce",
  "urissane",
  "xerelete",
  "yba"
];
function create_if_block$5(ctx) {
  let div2;
  let div1;
  let div0;
  let main;
  let p;
  let t0;
  let t1;
  let span;
  let button0;
  let sep;
  let button1;
  let div1_transition;
  let current;
  let mounted;
  let dispose;
  sep = new Separator({ props: { w: 4 } });
  return {
    c() {
      div2 = element("div");
      div1 = element("div");
      div0 = element("div");
      main = element("main");
      p = element("p");
      t0 = text(
        /*text*/
        ctx[1]
      );
      t1 = space();
      span = element("span");
      button0 = element("button");
      button0.textContent = "Sim";
      create_component(sep.$$.fragment);
      button1 = element("button");
      button1.textContent = "Cancelar";
      attr(main, "class", "svelte-aq0u68");
      attr(div0, "class", "modal-container svelte-aq0u68");
      attr(div1, "class", "modal-overlay svelte-aq0u68");
      attr(div1, "data-close", "");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div1);
      append(div1, div0);
      append(div0, main);
      append(main, p);
      append(p, t0);
      append(main, t1);
      append(main, span);
      append(span, button0);
      mount_component(sep, span, null);
      append(span, button1);
      current = true;
      if (!mounted) {
        dispose = [
          listen(
            button0,
            "click",
            /*click_handler*/
            ctx[4]
          ),
          listen(
            button1,
            "click",
            /*click_handler_1*/
            ctx[5]
          ),
          listen(
            div1,
            "click",
            /*overlay_click*/
            ctx[3]
          )
        ];
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (!current || dirty & /*text*/
      2) set_data(
        t0,
        /*text*/
        ctx2[1]
      );
    },
    i(local) {
      if (current) return;
      transition_in(sep.$$.fragment, local);
      if (local) {
        add_render_callback(() => {
          if (!current) return;
          if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 150 }, true);
          div1_transition.run(1);
        });
      }
      current = true;
    },
    o(local) {
      transition_out(sep.$$.fragment, local);
      if (local) {
        if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 150 }, false);
        div1_transition.run(0);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div2);
      }
      destroy_component(sep);
      if (detaching && div1_transition) div1_transition.end();
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_fragment$6(ctx) {
  let if_block_anchor;
  let current;
  let if_block = (
    /*show*/
    ctx[0] && create_if_block$5(ctx)
  );
  return {
    c() {
      if (if_block) if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if (if_block) if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (
        /*show*/
        ctx2[0]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*show*/
          1) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block$5(ctx2);
          if_block.c();
          transition_in(if_block, 1);
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      } else if (if_block) {
        group_outros();
        transition_out(if_block, 1, 1, () => {
          if_block = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if (if_block) if_block.d(detaching);
    }
  };
}
function instance$6($$self, $$props, $$invalidate) {
  const dispatch2 = createEventDispatcher();
  let { text: text2 = "Pergunta não definida" } = $$props;
  function confirm() {
    $$invalidate(0, show = false);
    dispatch2("remove");
  }
  function overlay_click(e) {
    if ("close" in e.target.dataset) $$invalidate(0, show = false);
  }
  let { show = false } = $$props;
  const click_handler = () => confirm();
  const click_handler_1 = () => $$invalidate(0, show = false);
  $$self.$$set = ($$props2) => {
    if ("text" in $$props2) $$invalidate(1, text2 = $$props2.text);
    if ("show" in $$props2) $$invalidate(0, show = $$props2.show);
  };
  return [show, text2, confirm, overlay_click, click_handler, click_handler_1];
}
class Modal extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$6, create_fragment$6, safe_not_equal, { text: 1, show: 0 });
  }
}
function get_each_context$2(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[6] = list[i];
  return child_ctx;
}
function create_if_block$4(ctx) {
  let nav;
  let button;
  let t1;
  let t2;
  let nav_transition;
  let current;
  let mounted;
  let dispose;
  const default_slot_template = (
    /*#slots*/
    ctx[3].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[2],
    null
  );
  let if_block = (
    /*selection*/
    ctx[1] && create_if_block_1$3(ctx)
  );
  return {
    c() {
      nav = element("nav");
      button = element("button");
      button.textContent = "Fechar";
      t1 = space();
      if (default_slot) default_slot.c();
      t2 = space();
      if (if_block) if_block.c();
      attr(button, "class", "svelte-bzcz4u");
      attr(nav, "class", "svelte-bzcz4u");
    },
    m(target, anchor) {
      insert(target, nav, anchor);
      append(nav, button);
      append(nav, t1);
      if (default_slot) {
        default_slot.m(nav, null);
      }
      append(nav, t2);
      if (if_block) if_block.m(nav, null);
      current = true;
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler*/
          ctx[4]
        );
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (default_slot) {
        if (default_slot.p && (!current || dirty & /*$$scope*/
        4)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[2],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[2]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx2[2],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (
        /*selection*/
        ctx2[1]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_1$3(ctx2);
          if_block.c();
          if_block.m(nav, null);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
    },
    i(local) {
      if (current) return;
      transition_in(default_slot, local);
      if (local) {
        add_render_callback(() => {
          if (!current) return;
          if (!nav_transition) nav_transition = create_bidirectional_transition(nav, fly, { x: 250, opacity: 1 }, true);
          nav_transition.run(1);
        });
      }
      current = true;
    },
    o(local) {
      transition_out(default_slot, local);
      if (local) {
        if (!nav_transition) nav_transition = create_bidirectional_transition(nav, fly, { x: 250, opacity: 1 }, false);
        nav_transition.run(0);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(nav);
      }
      if (default_slot) default_slot.d(detaching);
      if (if_block) if_block.d();
      if (detaching && nav_transition) nav_transition.end();
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_1$3(ctx) {
  let div2;
  let div0;
  let t1;
  let div1;
  let t3;
  let each_value = ensure_array_like(Object.keys(
    /*selection*/
    ctx[1]
  ));
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
  }
  return {
    c() {
      div2 = element("div");
      div0 = element("div");
      div0.textContent = "Campo";
      t1 = space();
      div1 = element("div");
      div1.textContent = "Valor";
      t3 = space();
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div0, "class", "grid1-header svelte-bzcz4u");
      attr(div1, "class", "grid1-header svelte-bzcz4u");
      attr(div2, "class", "grid1 svelte-bzcz4u");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div0);
      append(div2, t1);
      append(div2, div1);
      append(div2, t3);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div2, null);
        }
      }
    },
    p(ctx2, dirty) {
      if (dirty & /*breakine, selection, Object*/
      2) {
        each_value = ensure_array_like(Object.keys(
          /*selection*/
          ctx2[1]
        ));
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context$2(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block$2(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(div2, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div2);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_each_block$2(ctx) {
  let div0;
  let t0_value = (
    /*key*/
    ctx[6] + ""
  );
  let t0;
  let t1;
  let t2;
  let div1;
  let t3_value = breakine(
    /*selection*/
    ctx[1][
      /*key*/
      ctx[6]
    ]
  ) + "";
  let t3;
  return {
    c() {
      div0 = element("div");
      t0 = text(t0_value);
      t1 = text(":");
      t2 = space();
      div1 = element("div");
      t3 = text(t3_value);
      attr(div0, "class", "grid1-column grid1-firstcolumn svelte-bzcz4u");
      attr(div1, "class", "grid1-column svelte-bzcz4u");
    },
    m(target, anchor) {
      insert(target, div0, anchor);
      append(div0, t0);
      append(div0, t1);
      insert(target, t2, anchor);
      insert(target, div1, anchor);
      append(div1, t3);
    },
    p(ctx2, dirty) {
      if (dirty & /*selection*/
      2 && t0_value !== (t0_value = /*key*/
      ctx2[6] + "")) set_data(t0, t0_value);
      if (dirty & /*selection*/
      2 && t3_value !== (t3_value = breakine(
        /*selection*/
        ctx2[1][
          /*key*/
          ctx2[6]
        ]
      ) + "")) set_data(t3, t3_value);
    },
    d(detaching) {
      if (detaching) {
        detach(div0);
        detach(t2);
        detach(div1);
      }
    }
  };
}
function create_fragment$5(ctx) {
  let if_block_anchor;
  let current;
  let if_block = (
    /*show*/
    ctx[0] && create_if_block$4(ctx)
  );
  return {
    c() {
      if (if_block) if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if (if_block) if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
      if (
        /*show*/
        ctx2[0]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
          if (dirty & /*show*/
          1) {
            transition_in(if_block, 1);
          }
        } else {
          if_block = create_if_block$4(ctx2);
          if_block.c();
          transition_in(if_block, 1);
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      } else if (if_block) {
        group_outros();
        transition_out(if_block, 1, 1, () => {
          if_block = null;
        });
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if (if_block) if_block.d(detaching);
    }
  };
}
function stringToChanks(string, chunkSize) {
  const chunks = [];
  while (string.length > 0) {
    chunks.push(string.substring(0, chunkSize));
    string = string.substring(chunkSize, string.length);
  }
  return chunks;
}
function breakine(line) {
  if (line && line.length > 77) {
    return stringToChanks(line, 77).join("\n");
  }
  return line;
}
function instance$5($$self, $$props, $$invalidate) {
  let { $$slots: slots = {}, $$scope } = $$props;
  let { selection } = $$props;
  createEventDispatcher();
  let { show = false } = $$props;
  const click_handler = () => {
    $$invalidate(0, show = false);
  };
  $$self.$$set = ($$props2) => {
    if ("selection" in $$props2) $$invalidate(1, selection = $$props2.selection);
    if ("show" in $$props2) $$invalidate(0, show = $$props2.show);
    if ("$$scope" in $$props2) $$invalidate(2, $$scope = $$props2.$$scope);
  };
  return [show, selection, $$scope, slots, click_handler];
}
class SidebarDetails extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$5, create_fragment$5, safe_not_equal, { selection: 1, show: 0 });
  }
}
const clocks = [
  "🕐",
  "🕑",
  "🕒",
  "🕓",
  "🕔",
  "🕕",
  "🕖",
  "🕗",
  "🕘",
  "🕙",
  "🕚",
  "🕛"
];
const ticktac = writable(clocks[0]);
let count = 0;
setInterval(() => {
  ticktac.set(clocks[count % clocks.length]);
  count += 1;
}, 1e3);
function create_fragment$4(ctx) {
  let span1;
  let t0;
  let span0;
  let t1;
  let current;
  let mounted;
  let dispose;
  const default_slot_template = (
    /*#slots*/
    ctx[5].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[4],
    null
  );
  return {
    c() {
      span1 = element("span");
      if (default_slot) default_slot.c();
      t0 = space();
      span0 = element("span");
      t1 = text(
        /*text*/
        ctx[0]
      );
      attr(span0, "class", "tooltip-content svelte-6zg32");
      toggle_class(
        span0,
        "show-above",
        /*showAbove*/
        ctx[2]
      );
      toggle_class(span0, "show-below", !/*showAbove*/
      ctx[2]);
      attr(span1, "class", "tooltip svelte-6zg32");
    },
    m(target, anchor) {
      insert(target, span1, anchor);
      if (default_slot) {
        default_slot.m(span1, null);
      }
      append(span1, t0);
      append(span1, span0);
      append(span0, t1);
      ctx[6](span1);
      current = true;
      if (!mounted) {
        dispose = listen(
          span1,
          "mouseover",
          /*updateTooltipPosition*/
          ctx[3]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (default_slot) {
        if (default_slot.p && (!current || dirty & /*$$scope*/
        16)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[4],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[4]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx2[4],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (!current || dirty & /*text*/
      1) set_data(
        t1,
        /*text*/
        ctx2[0]
      );
      if (!current || dirty & /*showAbove*/
      4) {
        toggle_class(
          span0,
          "show-above",
          /*showAbove*/
          ctx2[2]
        );
      }
      if (!current || dirty & /*showAbove*/
      4) {
        toggle_class(span0, "show-below", !/*showAbove*/
        ctx2[2]);
      }
    },
    i(local) {
      if (current) return;
      transition_in(default_slot, local);
      current = true;
    },
    o(local) {
      transition_out(default_slot, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(span1);
      }
      if (default_slot) default_slot.d(detaching);
      ctx[6](null);
      mounted = false;
      dispose();
    }
  };
}
function instance$4($$self, $$props, $$invalidate) {
  let { $$slots: slots = {}, $$scope } = $$props;
  let { text: text2 = "" } = $$props;
  let tooltipElement;
  let showAbove = true;
  function updateTooltipPosition() {
    const rect = tooltipElement.getBoundingClientRect();
    const tooltipHeight = 120;
    if (rect.top < tooltipHeight) {
      $$invalidate(2, showAbove = false);
    } else {
      $$invalidate(2, showAbove = true);
    }
  }
  onMount(updateTooltipPosition);
  function span1_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      tooltipElement = $$value;
      $$invalidate(1, tooltipElement);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("text" in $$props2) $$invalidate(0, text2 = $$props2.text);
    if ("$$scope" in $$props2) $$invalidate(4, $$scope = $$props2.$$scope);
  };
  return [
    text2,
    tooltipElement,
    showAbove,
    updateTooltipPosition,
    $$scope,
    slots,
    span1_binding
  ];
}
class CustomToolTip extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$4, create_fragment$4, safe_not_equal, { text: 0 });
  }
}
function get_each_context$1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[55] = list[i];
  child_ctx[56] = list;
  child_ctx[57] = i;
  return child_ctx;
}
function get_each_context_1$1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[58] = list[i];
  child_ctx[60] = i;
  return child_ctx;
}
function create_default_slot_2(ctx) {
  let h4;
  return {
    c() {
      h4 = element("h4");
      h4.textContent = "Detalhes";
    },
    m(target, anchor) {
      insert(target, h4, anchor);
    },
    p: noop$1,
    d(detaching) {
      if (detaching) {
        detach(h4);
      }
    }
  };
}
function create_if_block_3$1(ctx) {
  let show_if;
  let t0;
  let button0;
  let t1;
  let button0_disabled_value;
  let t2;
  let button1;
  let t3;
  let button1_disabled_value;
  let t4;
  let t5;
  let button2;
  let t6;
  let button2_disabled_value;
  let mounted;
  let dispose;
  function select_block_type(ctx2, dirty) {
    if (dirty[0] & /*selectedRows*/
    16) show_if = null;
    if (show_if == null) show_if = !!/*selectedRows*/
    (ctx2[4].findIndex(func_1) === -1);
    if (show_if) return create_if_block_5;
    return create_else_block_1;
  }
  let current_block_type = select_block_type(ctx, [-1, -1]);
  let if_block = current_block_type(ctx);
  let each_value_1 = ensure_array_like(Array(
    /*pages*/
    ctx[10].length > 5 ? 5 : (
      /*pages*/
      ctx[10].length
    )
  ).fill(1));
  let each_blocks = [];
  for (let i = 0; i < each_value_1.length; i += 1) {
    each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
  }
  return {
    c() {
      if_block.c();
      t0 = space();
      button0 = element("button");
      t1 = text("Matar");
      t2 = space();
      button1 = element("button");
      t3 = text("«");
      t4 = space();
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      t5 = space();
      button2 = element("button");
      t6 = text("»");
      button0.disabled = button0_disabled_value = /*selectedRows*/
      ctx[4].findIndex(func_2) === -1;
      attr(button0, "class", "svelte-d3gb8o");
      button1.disabled = button1_disabled_value = /*page*/
      ctx[9] === 0;
      attr(button1, "class", "svelte-d3gb8o");
      button2.disabled = button2_disabled_value = /*page*/
      ctx[9] === /*pages*/
      ctx[10].length - 1;
      attr(button2, "class", "svelte-d3gb8o");
    },
    m(target, anchor) {
      if_block.m(target, anchor);
      insert(target, t0, anchor);
      insert(target, button0, anchor);
      append(button0, t1);
      insert(target, t2, anchor);
      insert(target, button1, anchor);
      append(button1, t3);
      insert(target, t4, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, t5, anchor);
      insert(target, button2, anchor);
      append(button2, t6);
      if (!mounted) {
        dispose = [
          listen(
            button0,
            "click",
            /*click_handler_3*/
            ctx[34]
          ),
          listen(
            button1,
            "click",
            /*click_handler_4*/
            ctx[35]
          ),
          listen(
            button2,
            "click",
            /*click_handler_6*/
            ctx[37]
          )
        ];
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (current_block_type === (current_block_type = select_block_type(ctx2, dirty)) && if_block) {
        if_block.p(ctx2, dirty);
      } else {
        if_block.d(1);
        if_block = current_block_type(ctx2);
        if (if_block) {
          if_block.c();
          if_block.m(t0.parentNode, t0);
        }
      }
      if (dirty[0] & /*selectedRows*/
      16 && button0_disabled_value !== (button0_disabled_value = /*selectedRows*/
      ctx2[4].findIndex(func_2) === -1)) {
        button0.disabled = button0_disabled_value;
      }
      if (dirty[0] & /*page*/
      512 && button1_disabled_value !== (button1_disabled_value = /*page*/
      ctx2[9] === 0)) {
        button1.disabled = button1_disabled_value;
      }
      if (dirty[0] & /*setPage, page, pages*/
      1050112) {
        each_value_1 = ensure_array_like(Array(
          /*pages*/
          ctx2[10].length > 5 ? 5 : (
            /*pages*/
            ctx2[10].length
          )
        ).fill(1));
        let i;
        for (i = 0; i < each_value_1.length; i += 1) {
          const child_ctx = get_each_context_1$1(ctx2, each_value_1, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_1$1(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(t5.parentNode, t5);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_1.length;
      }
      if (dirty[0] & /*page, pages*/
      1536 && button2_disabled_value !== (button2_disabled_value = /*page*/
      ctx2[9] === /*pages*/
      ctx2[10].length - 1)) {
        button2.disabled = button2_disabled_value;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(button0);
        detach(t2);
        detach(button1);
        detach(t4);
        detach(t5);
        detach(button2);
      }
      if_block.d(detaching);
      destroy_each(each_blocks, detaching);
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_else_block_1(ctx) {
  let button;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      button.textContent = "Desmarcar";
      attr(button, "class", "button_sized_1 svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler_2*/
          ctx[33]
        );
        mounted = true;
      }
    },
    p: noop$1,
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_5(ctx) {
  let button;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      button.textContent = "Selecionar Todos";
      attr(button, "class", "button_sized_1 svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*click_handler_1*/
          ctx[32]
        );
        mounted = true;
      }
    },
    p: noop$1,
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_4$1(ctx) {
  let button;
  let t_value = (
    /*page*/
    ctx[9] + /*i*/
    ctx[60] + 1 + ""
  );
  let t;
  let mounted;
  let dispose;
  function click_handler_5() {
    return (
      /*click_handler_5*/
      ctx[36](
        /*i*/
        ctx[60]
      )
    );
  }
  return {
    c() {
      button = element("button");
      t = text(t_value);
      attr(button, "type", "button");
      attr(button, "class", "btn-page-number svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, t);
      if (!mounted) {
        dispose = listen(button, "click", click_handler_5);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*page*/
      512 && t_value !== (t_value = /*page*/
      ctx[9] + /*i*/
      ctx[60] + 1 + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_each_block_1$1(ctx) {
  let if_block_anchor;
  let if_block = (
    /*page*/
    ctx[9] + /*i*/
    ctx[60] < /*pages*/
    ctx[10].length && create_if_block_4$1(ctx)
  );
  return {
    c() {
      if (if_block) if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if (if_block) if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (
        /*page*/
        ctx2[9] + /*i*/
        ctx2[60] < /*pages*/
        ctx2[10].length
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_4$1(ctx2);
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if (if_block) if_block.d(detaching);
    }
  };
}
function create_if_block_2$1(ctx) {
  let span;
  let t0;
  let t1_value = (
    /*pages*/
    ctx[10].length + ""
  );
  let t1;
  return {
    c() {
      span = element("span");
      t0 = text("Total de páginas: ");
      t1 = text(t1_value);
      attr(span, "class", "text svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t0);
      append(span, t1);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*pages*/
      1024 && t1_value !== (t1_value = /*pages*/
      ctx2[10].length + "")) set_data(t1, t1_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_default_slot_1(ctx) {
  let span;
  let t;
  let input;
  let mounted;
  let dispose;
  return {
    c() {
      span = element("span");
      t = text("Datas iguais: ");
      input = element("input");
      attr(input, "type", "checkbox");
      attr(input, "class", "svelte-d3gb8o");
      attr(span, "class", "text svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t);
      append(span, input);
      input.checked = /*sameDate*/
      ctx[15];
      if (!mounted) {
        dispose = listen(
          input,
          "change",
          /*input_change_handler*/
          ctx[38]
        );
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*sameDate*/
      32768) {
        input.checked = /*sameDate*/
        ctx2[15];
      }
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_1$2(ctx) {
  let t0;
  let t1;
  let sep;
  let current;
  sep = new Separator({ props: { w: 2 } });
  return {
    c() {
      t0 = text("Carregando...");
      t1 = text(
        /*localTickTack*/
        ctx[13]
      );
      create_component(sep.$$.fragment);
    },
    m(target, anchor) {
      insert(target, t0, anchor);
      insert(target, t1, anchor);
      mount_component(sep, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      if (!current || dirty[0] & /*localTickTack*/
      8192) set_data(
        t1,
        /*localTickTack*/
        ctx2[13]
      );
    },
    i(local) {
      if (current) return;
      transition_in(sep.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(sep.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(t1);
      }
      destroy_component(sep, detaching);
    }
  };
}
function create_default_slot$1(ctx) {
  let button;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      button.textContent = "Progresso";
      attr(button, "class", "svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*getProgress*/
          ctx[24]
        );
        mounted = true;
      }
    },
    p: noop$1,
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_else_block$3(ctx) {
  let div;
  let a;
  let t_value = shortName(
    /*job*/
    ctx[55].name
  ) + "";
  let t;
  let mounted;
  let dispose;
  function click_handler_10() {
    return (
      /*click_handler_10*/
      ctx[43](
        /*job*/
        ctx[55]
      )
    );
  }
  return {
    c() {
      div = element("div");
      a = element("a");
      t = text(t_value);
      attr(a, "class", "svelte-d3gb8o");
      attr(div, "class", "grid1-column svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, a);
      append(a, t);
      if (!mounted) {
        dispose = listen(a, "click", click_handler_10);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*currentPageRows*/
      2048 && t_value !== (t_value = shortName(
        /*job*/
        ctx[55].name
      ) + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block$3(ctx) {
  let div;
  let a;
  let t_value = shortName(
    /*job*/
    ctx[55].name
  ) + "";
  let t;
  let mounted;
  let dispose;
  function click_handler_9() {
    return (
      /*click_handler_9*/
      ctx[42](
        /*job*/
        ctx[55]
      )
    );
  }
  return {
    c() {
      div = element("div");
      a = element("a");
      t = text(t_value);
      attr(a, "class", "svelte-d3gb8o");
      attr(div, "class", "grid1-column svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, a);
      append(a, t);
      if (!mounted) {
        dispose = listen(a, "click", click_handler_9);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*currentPageRows*/
      2048 && t_value !== (t_value = shortName(
        /*job*/
        ctx[55].name
      ) + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_each_block$1(key_1, ctx) {
  let div0;
  let input;
  let input_disabled_value;
  let t0;
  let div1;
  let a0;
  let t1_value = (
    /*job*/
    ctx[55].id + ""
  );
  let t1;
  let t2;
  let div2;
  let a1;
  let t3_value = (
    /*job*/
    ctx[55].user + ""
  );
  let t3;
  let t4;
  let div3;
  let t5_value = (
    /*job*/
    ctx[55].state.split(" ")[0] + ""
  );
  let t5;
  let t6;
  let div4;
  let t7_value = (
    /*job*/
    ctx[55].account + ""
  );
  let t7;
  let t8;
  let div7;
  let div6;
  let div5;
  let span;
  let t9_value = (
    /*job*/
    ctx[55].id in /*progress*/
    ctx[8] ? Number(
      /*progress*/
      ctx[8][
        /*job*/
        ctx[55].id
      ]
    ) >= 0 && Number(
      /*progress*/
      ctx[8][
        /*job*/
        ctx[55].id
      ]
    ) <= 100 ? (
      /*progress*/
      ctx[8][
        /*job*/
        ctx[55].id
      ] + "%"
    ) : "ERR" : "WAIT"
  );
  let t9;
  let t10;
  let div8;
  let t11_value = converSlurmTime2Short(
    /*job*/
    ctx[55].age
  ) + "";
  let t11;
  let t12;
  let div9;
  let t13_value = convertISODate2LocalTime(
    /*job*/
    ctx[55].startTime
  ) + "";
  let t13;
  let t14;
  let show_if;
  let t15;
  let div10;
  let a2;
  let t17;
  let sep0;
  let t18;
  let sep1;
  let t19;
  let a3;
  let t21;
  let current;
  let mounted;
  let dispose;
  function func(...args) {
    return (
      /*func*/
      ctx[25](
        /*job*/
        ctx[55],
        ...args
      )
    );
  }
  function input_change_handler_1() {
    ctx[39].call(
      input,
      /*job*/
      ctx[55]
    );
  }
  function click_handler_7() {
    return (
      /*click_handler_7*/
      ctx[40](
        /*job*/
        ctx[55]
      )
    );
  }
  function click_handler_8() {
    return (
      /*click_handler_8*/
      ctx[41](
        /*job*/
        ctx[55]
      )
    );
  }
  function select_block_type_1(ctx2, dirty) {
    if (dirty[0] & /*currentPageRows*/
    2048) show_if = null;
    if (show_if == null) show_if = !!/*job*/
    (ctx2[55].name.match(/\.(data|dat)$|((data|dat)\.[a-f0-9]{8})$/i) || /*job*/
    ctx2[55].work_dir.match(/.*\.cmpd.*/i));
    if (show_if) return create_if_block$3;
    return create_else_block$3;
  }
  let current_block_type = select_block_type_1(ctx, [-1, -1]);
  let if_block = current_block_type(ctx);
  function click_handler_11() {
    return (
      /*click_handler_11*/
      ctx[44](
        /*job*/
        ctx[55]
      )
    );
  }
  sep0 = new Separator({ props: { w: 1 } });
  sep1 = new Separator({ props: { w: 1 } });
  function click_handler_12() {
    return (
      /*click_handler_12*/
      ctx[45](
        /*job*/
        ctx[55]
      )
    );
  }
  return {
    key: key_1,
    first: null,
    c() {
      div0 = element("div");
      input = element("input");
      t0 = space();
      div1 = element("div");
      a0 = element("a");
      t1 = text(t1_value);
      t2 = space();
      div2 = element("div");
      a1 = element("a");
      t3 = text(t3_value);
      t4 = space();
      div3 = element("div");
      t5 = text(t5_value);
      t6 = space();
      div4 = element("div");
      t7 = text(t7_value);
      t8 = space();
      div7 = element("div");
      div6 = element("div");
      div5 = element("div");
      span = element("span");
      t9 = text(t9_value);
      t10 = space();
      div8 = element("div");
      t11 = text(t11_value);
      t12 = space();
      div9 = element("div");
      t13 = text(t13_value);
      t14 = space();
      if_block.c();
      t15 = space();
      div10 = element("div");
      a2 = element("a");
      a2.textContent = "Win Explorer";
      t17 = space();
      create_component(sep0.$$.fragment);
      t18 = text("|");
      create_component(sep1.$$.fragment);
      t19 = space();
      a3 = element("a");
      a3.textContent = "VSCode";
      t21 = space();
      attr(input, "type", "checkbox");
      input.disabled = input_disabled_value = /*job*/
      ctx[55].user !== getMeta("user");
      attr(input, "class", "svelte-d3gb8o");
      attr(div0, "class", "grid1-column svelte-d3gb8o");
      attr(a0, "href", "/");
      attr(a0, "class", "svelte-d3gb8o");
      attr(div1, "class", "grid1-column svelte-d3gb8o");
      attr(a1, "href", "/");
      attr(a1, "class", "svelte-d3gb8o");
      attr(div2, "class", "grid1-column svelte-d3gb8o");
      attr(div3, "class", "grid1-column svelte-d3gb8o");
      attr(div4, "class", "grid1-column svelte-d3gb8o");
      attr(span, "class", "progress-text svelte-d3gb8o");
      attr(div5, "class", "progress-bar svelte-d3gb8o");
      set_style(
        div5,
        "width",
        /*job*/
        (ctx[55].id in /*progress*/
        ctx[8] ? Number(
          /*progress*/
          ctx[8][
            /*job*/
            ctx[55].id
          ]
        ) >= 0 && Number(
          /*progress*/
          ctx[8][
            /*job*/
            ctx[55].id
          ]
        ) <= 100 ? (
          /*progress*/
          ctx[8][
            /*job*/
            ctx[55].id
          ]
        ) : 0 : 0) + "%"
      );
      attr(div6, "class", "progress-cell svelte-d3gb8o");
      attr(div7, "class", "grid1-column svelte-d3gb8o");
      attr(div8, "class", "grid1-column svelte-d3gb8o");
      attr(div9, "class", "grid1-column svelte-d3gb8o");
      attr(a2, "class", "svelte-d3gb8o");
      attr(a3, "class", "svelte-d3gb8o");
      attr(div10, "class", "grid1-column svelte-d3gb8o");
      this.first = div0;
    },
    m(target, anchor) {
      insert(target, div0, anchor);
      append(div0, input);
      input.checked = /*selectedRows*/
      ctx[4][
        /*rows*/
        ctx[3].findIndex(func)
      ];
      insert(target, t0, anchor);
      insert(target, div1, anchor);
      append(div1, a0);
      append(a0, t1);
      insert(target, t2, anchor);
      insert(target, div2, anchor);
      append(div2, a1);
      append(a1, t3);
      insert(target, t4, anchor);
      insert(target, div3, anchor);
      append(div3, t5);
      insert(target, t6, anchor);
      insert(target, div4, anchor);
      append(div4, t7);
      insert(target, t8, anchor);
      insert(target, div7, anchor);
      append(div7, div6);
      append(div6, div5);
      append(div5, span);
      append(span, t9);
      insert(target, t10, anchor);
      insert(target, div8, anchor);
      append(div8, t11);
      insert(target, t12, anchor);
      insert(target, div9, anchor);
      append(div9, t13);
      insert(target, t14, anchor);
      if_block.m(target, anchor);
      insert(target, t15, anchor);
      insert(target, div10, anchor);
      append(div10, a2);
      append(div10, t17);
      mount_component(sep0, div10, null);
      append(div10, t18);
      mount_component(sep1, div10, null);
      append(div10, t19);
      append(div10, a3);
      append(div10, t21);
      current = true;
      if (!mounted) {
        dispose = [
          listen(input, "change", input_change_handler_1),
          listen(a0, "click", click_handler_7),
          listen(a1, "click", click_handler_8),
          listen(a2, "click", click_handler_11),
          listen(a3, "click", click_handler_12)
        ];
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (!current || dirty[0] & /*currentPageRows*/
      2048 && input_disabled_value !== (input_disabled_value = /*job*/
      ctx[55].user !== getMeta("user"))) {
        input.disabled = input_disabled_value;
      }
      if (dirty[0] & /*selectedRows, rows, currentPageRows*/
      2072) {
        input.checked = /*selectedRows*/
        ctx[4][
          /*rows*/
          ctx[3].findIndex(func)
        ];
      }
      if ((!current || dirty[0] & /*currentPageRows*/
      2048) && t1_value !== (t1_value = /*job*/
      ctx[55].id + "")) set_data(t1, t1_value);
      if ((!current || dirty[0] & /*currentPageRows*/
      2048) && t3_value !== (t3_value = /*job*/
      ctx[55].user + "")) set_data(t3, t3_value);
      if ((!current || dirty[0] & /*currentPageRows*/
      2048) && t5_value !== (t5_value = /*job*/
      ctx[55].state.split(" ")[0] + "")) set_data(t5, t5_value);
      if ((!current || dirty[0] & /*currentPageRows*/
      2048) && t7_value !== (t7_value = /*job*/
      ctx[55].account + "")) set_data(t7, t7_value);
      if ((!current || dirty[0] & /*currentPageRows, progress*/
      2304) && t9_value !== (t9_value = /*job*/
      ctx[55].id in /*progress*/
      ctx[8] ? Number(
        /*progress*/
        ctx[8][
          /*job*/
          ctx[55].id
        ]
      ) >= 0 && Number(
        /*progress*/
        ctx[8][
          /*job*/
          ctx[55].id
        ]
      ) <= 100 ? (
        /*progress*/
        ctx[8][
          /*job*/
          ctx[55].id
        ] + "%"
      ) : "ERR" : "WAIT")) set_data(t9, t9_value);
      if (!current || dirty[0] & /*currentPageRows, progress*/
      2304) {
        set_style(
          div5,
          "width",
          /*job*/
          (ctx[55].id in /*progress*/
          ctx[8] ? Number(
            /*progress*/
            ctx[8][
              /*job*/
              ctx[55].id
            ]
          ) >= 0 && Number(
            /*progress*/
            ctx[8][
              /*job*/
              ctx[55].id
            ]
          ) <= 100 ? (
            /*progress*/
            ctx[8][
              /*job*/
              ctx[55].id
            ]
          ) : 0 : 0) + "%"
        );
      }
      if ((!current || dirty[0] & /*currentPageRows*/
      2048) && t11_value !== (t11_value = converSlurmTime2Short(
        /*job*/
        ctx[55].age
      ) + "")) set_data(t11, t11_value);
      if ((!current || dirty[0] & /*currentPageRows*/
      2048) && t13_value !== (t13_value = convertISODate2LocalTime(
        /*job*/
        ctx[55].startTime
      ) + "")) set_data(t13, t13_value);
      if (current_block_type === (current_block_type = select_block_type_1(ctx, dirty)) && if_block) {
        if_block.p(ctx, dirty);
      } else {
        if_block.d(1);
        if_block = current_block_type(ctx);
        if (if_block) {
          if_block.c();
          if_block.m(t15.parentNode, t15);
        }
      }
    },
    i(local) {
      if (current) return;
      transition_in(sep0.$$.fragment, local);
      transition_in(sep1.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(sep0.$$.fragment, local);
      transition_out(sep1.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div0);
        detach(t0);
        detach(div1);
        detach(t2);
        detach(div2);
        detach(t4);
        detach(div3);
        detach(t6);
        detach(div4);
        detach(t8);
        detach(div7);
        detach(t10);
        detach(div8);
        detach(t12);
        detach(div9);
        detach(t14);
        detach(t15);
        detach(div10);
      }
      if_block.d(detaching);
      destroy_component(sep0);
      destroy_component(sep1);
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_fragment$3(ctx) {
  let main;
  let modal;
  let updating_show;
  let t0;
  let div15;
  let sidebardetails;
  let updating_show_1;
  let t1;
  let div1;
  let div0;
  let label0;
  let t3;
  let input0;
  let t4;
  let sep0;
  let t5;
  let label1;
  let t7;
  let input1;
  let t8;
  let sep1;
  let t9;
  let button;
  let t11;
  let sep2;
  let t12;
  let t13;
  let sep3;
  let t14;
  let span;
  let t15_value = (
    /*rows*/
    ctx[3].length + ""
  );
  let t15;
  let t16;
  let t17;
  let sep4;
  let t18;
  let tooltip0;
  let t19;
  let div2;
  let html_tag;
  let raw_value = (
    /*statusMessage*/
    ctx[7].split(":")[0] + ""
  );
  let html_anchor;
  let sep5;
  let t20;
  let div14;
  let toasts2;
  let t21;
  let div13;
  let div3;
  let t23;
  let div4;
  let t25;
  let div5;
  let t27;
  let div6;
  let t29;
  let div7;
  let t31;
  let div8;
  let tooltip1;
  let t32;
  let div9;
  let t34;
  let div10;
  let t36;
  let div11;
  let t38;
  let div12;
  let t40;
  let each_blocks = [];
  let each_1_lookup = /* @__PURE__ */ new Map();
  let current;
  let mounted;
  let dispose;
  function modal_show_binding(value) {
    ctx[26](value);
  }
  let modal_props = { text: modal_question$1 };
  if (
    /*modal_show*/
    ctx[5] !== void 0
  ) {
    modal_props.show = /*modal_show*/
    ctx[5];
  }
  modal = new Modal({ props: modal_props });
  binding_callbacks.push(() => bind$1(modal, "show", modal_show_binding));
  modal.$on(
    "remove",
    /*remove_handler*/
    ctx[27]
  );
  function sidebardetails_show_binding(value) {
    ctx[28](value);
  }
  let sidebardetails_props = {
    selection: (
      /*selection*/
      ctx[12]
    ),
    $$slots: { default: [create_default_slot_2] },
    $$scope: { ctx }
  };
  if (
    /*sidebar_show*/
    ctx[6] !== void 0
  ) {
    sidebardetails_props.show = /*sidebar_show*/
    ctx[6];
  }
  sidebardetails = new SidebarDetails({ props: sidebardetails_props });
  binding_callbacks.push(() => bind$1(sidebardetails, "show", sidebardetails_show_binding));
  sep0 = new Separator({ props: { w: 1 } });
  sep1 = new Separator({ props: { w: 1 } });
  sep2 = new Separator({ props: { w: 2 } });
  let if_block0 = (
    /*rows*/
    ctx[3].length > 0 && create_if_block_3$1(ctx)
  );
  sep3 = new Separator({ props: { w: 1 } });
  let if_block1 = (
    /*rows*/
    ctx[3].length > 0 && create_if_block_2$1(ctx)
  );
  sep4 = new Separator({ props: { w: 2 } });
  tooltip0 = new CustomToolTip({
    props: {
      text: "Selecione para ler o progresso dos modelos usando a mesma data de fim da simulação (mais rápido)",
      $$slots: { default: [create_default_slot_1] },
      $$scope: { ctx }
    }
  });
  sep5 = new Separator({ props: { w: 2 } });
  let if_block2 = (
    /*loading*/
    ctx[14] && create_if_block_1$2(ctx)
  );
  toasts2 = new Toasts({});
  tooltip1 = new CustomToolTip({
    props: {
      text: "clique para atualizar o progresso (apenas CMG)",
      $$slots: { default: [create_default_slot$1] },
      $$scope: { ctx }
    }
  });
  let each_value = ensure_array_like(
    /*currentPageRows*/
    ctx[11]
  );
  const get_key = (ctx2) => (
    /*job*/
    ctx2[55].id
  );
  for (let i = 0; i < each_value.length; i += 1) {
    let child_ctx = get_each_context$1(ctx, each_value, i);
    let key = get_key(child_ctx);
    each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
  }
  return {
    c() {
      main = element("main");
      create_component(modal.$$.fragment);
      t0 = space();
      div15 = element("div");
      create_component(sidebardetails.$$.fragment);
      t1 = space();
      div1 = element("div");
      div0 = element("div");
      label0 = element("label");
      label0.textContent = "Usuário:";
      t3 = space();
      input0 = element("input");
      t4 = space();
      create_component(sep0.$$.fragment);
      t5 = space();
      label1 = element("label");
      label1.textContent = "Account:";
      t7 = space();
      input1 = element("input");
      t8 = space();
      create_component(sep1.$$.fragment);
      t9 = space();
      button = element("button");
      button.textContent = "Recarregar";
      t11 = space();
      create_component(sep2.$$.fragment);
      t12 = space();
      if (if_block0) if_block0.c();
      t13 = space();
      create_component(sep3.$$.fragment);
      t14 = space();
      span = element("span");
      t15 = text(t15_value);
      t16 = space();
      if (if_block1) if_block1.c();
      t17 = space();
      create_component(sep4.$$.fragment);
      t18 = space();
      create_component(tooltip0.$$.fragment);
      t19 = space();
      div2 = element("div");
      html_tag = new HtmlTag(false);
      html_anchor = empty();
      create_component(sep5.$$.fragment);
      if (if_block2) if_block2.c();
      t20 = space();
      div14 = element("div");
      create_component(toasts2.$$.fragment);
      t21 = space();
      div13 = element("div");
      div3 = element("div");
      div3.textContent = "Sel.";
      t23 = space();
      div4 = element("div");
      div4.textContent = "Id";
      t25 = space();
      div5 = element("div");
      div5.textContent = "User";
      t27 = space();
      div6 = element("div");
      div6.textContent = "Status";
      t29 = space();
      div7 = element("div");
      div7.textContent = "Account";
      t31 = space();
      div8 = element("div");
      create_component(tooltip1.$$.fragment);
      t32 = space();
      div9 = element("div");
      div9.textContent = "Age";
      t34 = space();
      div10 = element("div");
      div10.textContent = "Start";
      t36 = space();
      div11 = element("div");
      div11.textContent = "Nome (clique em um para acessar o log)";
      t38 = space();
      div12 = element("div");
      div12.textContent = "Abrir pasta...";
      t40 = space();
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(label0, "for", "user");
      attr(label0, "class", "text svelte-d3gb8o");
      attr(input0, "placeholder", getMeta("user"));
      attr(input0, "class", "v_i svelte-d3gb8o");
      attr(input0, "type", "text");
      attr(input0, "max", "4");
      attr(input0, "name", "user");
      set_style(input0, "width", "50px");
      attr(label1, "for", "user");
      attr(label1, "class", "text svelte-d3gb8o");
      attr(input1, "class", "v_i svelte-d3gb8o");
      attr(input1, "type", "text");
      attr(input1, "max", "16");
      attr(input1, "name", "user");
      set_style(input1, "width", "150px");
      attr(button, "class", "button green svelte-d3gb8o");
      attr(span, "class", "badge svelte-d3gb8o");
      attr(div0, "id", "top");
      attr(div0, "class", "pageTop svelte-d3gb8o");
      attr(div1, "class", "first-line svelte-d3gb8o");
      html_tag.a = html_anchor;
      attr(div2, "class", "second-line svelte-d3gb8o");
      attr(div3, "class", "grid1-header svelte-d3gb8o");
      attr(div4, "class", "grid1-header svelte-d3gb8o");
      attr(div5, "class", "grid1-header svelte-d3gb8o");
      attr(div6, "class", "grid1-header svelte-d3gb8o");
      attr(div7, "class", "grid1-header svelte-d3gb8o");
      attr(div8, "class", "grid1-header svelte-d3gb8o");
      attr(div9, "class", "grid1-header svelte-d3gb8o");
      attr(div10, "class", "grid1-header svelte-d3gb8o");
      attr(div11, "class", "grid1-header svelte-d3gb8o");
      attr(div12, "class", "grid1-header svelte-d3gb8o");
      attr(div13, "class", "grid1 svelte-d3gb8o");
      attr(div14, "class", "third-line svelte-d3gb8o");
      attr(div15, "class", "wrapper svelte-d3gb8o");
      attr(main, "class", "svelte-d3gb8o");
    },
    m(target, anchor) {
      insert(target, main, anchor);
      mount_component(modal, main, null);
      append(main, t0);
      append(main, div15);
      mount_component(sidebardetails, div15, null);
      append(div15, t1);
      append(div15, div1);
      append(div1, div0);
      append(div0, label0);
      append(div0, t3);
      append(div0, input0);
      set_input_value(
        input0,
        /*selectedUser*/
        ctx[1]
      );
      append(div0, t4);
      mount_component(sep0, div0, null);
      append(div0, t5);
      append(div0, label1);
      append(div0, t7);
      append(div0, input1);
      set_input_value(
        input1,
        /*selectedAccount*/
        ctx[2]
      );
      append(div0, t8);
      mount_component(sep1, div0, null);
      append(div0, t9);
      append(div0, button);
      append(div0, t11);
      mount_component(sep2, div0, null);
      append(div0, t12);
      if (if_block0) if_block0.m(div0, null);
      append(div0, t13);
      mount_component(sep3, div0, null);
      append(div0, t14);
      append(div0, span);
      append(span, t15);
      append(div0, t16);
      if (if_block1) if_block1.m(div0, null);
      append(div0, t17);
      mount_component(sep4, div0, null);
      append(div0, t18);
      mount_component(tooltip0, div0, null);
      append(div15, t19);
      append(div15, div2);
      html_tag.m(raw_value, div2);
      append(div2, html_anchor);
      mount_component(sep5, div2, null);
      if (if_block2) if_block2.m(div2, null);
      append(div15, t20);
      append(div15, div14);
      mount_component(toasts2, div14, null);
      append(div14, t21);
      append(div14, div13);
      append(div13, div3);
      append(div13, t23);
      append(div13, div4);
      append(div13, t25);
      append(div13, div5);
      append(div13, t27);
      append(div13, div6);
      append(div13, t29);
      append(div13, div7);
      append(div13, t31);
      append(div13, div8);
      mount_component(tooltip1, div8, null);
      append(div13, t32);
      append(div13, div9);
      append(div13, t34);
      append(div13, div10);
      append(div13, t36);
      append(div13, div11);
      append(div13, t38);
      append(div13, div12);
      append(div13, t40);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div13, null);
        }
      }
      current = true;
      if (!mounted) {
        dispose = [
          listen(
            input0,
            "input",
            /*input0_input_handler*/
            ctx[29]
          ),
          listen(
            input1,
            "input",
            /*input1_input_handler*/
            ctx[30]
          ),
          listen(
            button,
            "click",
            /*click_handler*/
            ctx[31]
          )
        ];
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      const modal_changes = {};
      if (!updating_show && dirty[0] & /*modal_show*/
      32) {
        updating_show = true;
        modal_changes.show = /*modal_show*/
        ctx2[5];
        add_flush_callback(() => updating_show = false);
      }
      modal.$set(modal_changes);
      const sidebardetails_changes = {};
      if (dirty[0] & /*selection*/
      4096) sidebardetails_changes.selection = /*selection*/
      ctx2[12];
      if (dirty[1] & /*$$scope*/
      1073741824) {
        sidebardetails_changes.$$scope = { dirty, ctx: ctx2 };
      }
      if (!updating_show_1 && dirty[0] & /*sidebar_show*/
      64) {
        updating_show_1 = true;
        sidebardetails_changes.show = /*sidebar_show*/
        ctx2[6];
        add_flush_callback(() => updating_show_1 = false);
      }
      sidebardetails.$set(sidebardetails_changes);
      if (dirty[0] & /*selectedUser*/
      2 && input0.value !== /*selectedUser*/
      ctx2[1]) {
        set_input_value(
          input0,
          /*selectedUser*/
          ctx2[1]
        );
      }
      if (dirty[0] & /*selectedAccount*/
      4 && input1.value !== /*selectedAccount*/
      ctx2[2]) {
        set_input_value(
          input1,
          /*selectedAccount*/
          ctx2[2]
        );
      }
      if (
        /*rows*/
        ctx2[3].length > 0
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_3$1(ctx2);
          if_block0.c();
          if_block0.m(div0, t13);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if ((!current || dirty[0] & /*rows*/
      8) && t15_value !== (t15_value = /*rows*/
      ctx2[3].length + "")) set_data(t15, t15_value);
      if (
        /*rows*/
        ctx2[3].length > 0
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block_2$1(ctx2);
          if_block1.c();
          if_block1.m(div0, t17);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      const tooltip0_changes = {};
      if (dirty[0] & /*sameDate*/
      32768 | dirty[1] & /*$$scope*/
      1073741824) {
        tooltip0_changes.$$scope = { dirty, ctx: ctx2 };
      }
      tooltip0.$set(tooltip0_changes);
      if ((!current || dirty[0] & /*statusMessage*/
      128) && raw_value !== (raw_value = /*statusMessage*/
      ctx2[7].split(":")[0] + "")) html_tag.p(raw_value);
      if (
        /*loading*/
        ctx2[14]
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
          if (dirty[0] & /*loading*/
          16384) {
            transition_in(if_block2, 1);
          }
        } else {
          if_block2 = create_if_block_1$2(ctx2);
          if_block2.c();
          transition_in(if_block2, 1);
          if_block2.m(div2, null);
        }
      } else if (if_block2) {
        group_outros();
        transition_out(if_block2, 1, 1, () => {
          if_block2 = null;
        });
        check_outros();
      }
      const tooltip1_changes = {};
      if (dirty[1] & /*$$scope*/
      1073741824) {
        tooltip1_changes.$$scope = { dirty, ctx: ctx2 };
      }
      tooltip1.$set(tooltip1_changes);
      if (dirty[0] & /*openVScodeFolder, currentPageRows, openSystemFolder, openLog, progress, openPortal, moreInfo, selectedRows, rows*/
      15468824) {
        each_value = ensure_array_like(
          /*currentPageRows*/
          ctx2[11]
        );
        group_outros();
        each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx2, each_value, each_1_lookup, div13, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      transition_in(modal.$$.fragment, local);
      transition_in(sidebardetails.$$.fragment, local);
      transition_in(sep0.$$.fragment, local);
      transition_in(sep1.$$.fragment, local);
      transition_in(sep2.$$.fragment, local);
      transition_in(sep3.$$.fragment, local);
      transition_in(sep4.$$.fragment, local);
      transition_in(tooltip0.$$.fragment, local);
      transition_in(sep5.$$.fragment, local);
      transition_in(if_block2);
      transition_in(toasts2.$$.fragment, local);
      transition_in(tooltip1.$$.fragment, local);
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      transition_out(modal.$$.fragment, local);
      transition_out(sidebardetails.$$.fragment, local);
      transition_out(sep0.$$.fragment, local);
      transition_out(sep1.$$.fragment, local);
      transition_out(sep2.$$.fragment, local);
      transition_out(sep3.$$.fragment, local);
      transition_out(sep4.$$.fragment, local);
      transition_out(tooltip0.$$.fragment, local);
      transition_out(sep5.$$.fragment, local);
      transition_out(if_block2);
      transition_out(toasts2.$$.fragment, local);
      transition_out(tooltip1.$$.fragment, local);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(main);
      }
      destroy_component(modal);
      destroy_component(sidebardetails);
      destroy_component(sep0);
      destroy_component(sep1);
      destroy_component(sep2);
      if (if_block0) if_block0.d();
      destroy_component(sep3);
      if (if_block1) if_block1.d();
      destroy_component(sep4);
      destroy_component(tooltip0);
      destroy_component(sep5);
      if (if_block2) if_block2.d();
      destroy_component(toasts2);
      destroy_component(tooltip1);
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].d();
      }
      mounted = false;
      run_all(dispose);
    }
  };
}
let modal_question$1 = "Confirma matar os jobs selecionados?";
const autoRefreshInterval = 3e4;
function shortName(str, maxLength = 70) {
  if (str.length <= maxLength) {
    return str;
  } else if (str.length <= maxLength + 3) {
    const numDots = str.length - maxLength;
    const start2 = str.substring(0, maxLength - numDots);
    const dots = ".".repeat(numDots);
    return `${start2}${dots}`;
  }
  const partSize = Math.floor((maxLength - 3) / 2);
  const start = str.substring(0, partSize);
  const end = str.substring(str.length - partSize);
  return `${start}...${end}`;
}
const func_1 = (e) => e === true;
const func_2 = (e) => e === true;
function instance$3($$self, $$props, $$invalidate) {
  let modal_show = false;
  let sidebar_show = false;
  let statusMessage = ":";
  let selectedUser = "";
  let selectedAccount = "";
  let rows = [];
  let progress = {};
  let selectedRows = Array(rows.length).fill(false);
  let page = 0;
  let pages = [];
  let currentPageRows = [];
  let { itemsPerPage = 25 } = $$props;
  let selection = {};
  let localTickTack = "";
  ticktac.subscribe((value) => $$invalidate(13, localTickTack = value));
  let loading = false;
  let sameDate = true;
  let interval = null;
  let nonRecurre = false;
  getMeta("proxyPort");
  let timeout = null;
  function showMessage(message, delay = 3e3) {
    $$invalidate(7, statusMessage = message + ":" + Math.random().toString(36).slice(-5));
    if (timeout) clearTimeout(timeout);
    if (delay) {
      timeout = setTimeout(
        () => {
          $$invalidate(7, statusMessage = ":");
        },
        delay
      );
    }
  }
  const paginate = (items) => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = Array.from({ length: totalPages }, (_, index) => {
      const start = index * itemsPerPage;
      return items.slice(start, start + itemsPerPage);
    });
    $$invalidate(10, pages = [...paginatedItems]);
    $$invalidate(11, currentPageRows = pages.length > 0 ? pages[0] : []);
    console.log("Tamanho da página calculado:" + pages.length);
    $$invalidate(9, page = 0);
  };
  onMount(() => {
    showMessage("A busca é automática e realizada conforme o filtro");
    clearToasts();
    const rcvEvents = (param) => {
      let data = "data" in param ? param["data"] : param["detail"];
      if (data && "message" in data) {
        switch (data.message) {
          case "jobs":
            $$invalidate(3, rows = data.payload);
            $$invalidate(4, selectedRows = Array(rows.length).fill(false));
            paginate(rows);
            $$invalidate(14, loading = false);
            nonRecurre = false;
            break;
          case "updateJobs":
            if (currentPageRows.length > 0) {
              for (const ret of data.payload) {
                const idx = currentPageRows.findIndex((e) => e.id === ret["id"]);
                if (idx >= 0) {
                  $$invalidate(11, currentPageRows[idx]["state"] = ret["state"], currentPageRows);
                  $$invalidate(11, currentPageRows[idx]["age"] = ret["age"], currentPageRows);
                }
              }
            }
            break;
          case "info":
            if ("extra" in data && data.extra === "noJobs") {
              console.log("Não retornou dados");
              $$invalidate(8, progress = {});
              $$invalidate(14, loading = false);
              nonRecurre = false;
              $$invalidate(3, rows = []);
              $$invalidate(4, selectedRows = Array(rows.length).fill(false));
              paginate(rows);
              showMessage("Não retornou jobs com o filtro atual", 6e3);
            }
            break;
          case "openLogRet":
            if (data.retcode !== 200) showMessage(data.extra, 4e3);
            break;
          case "cmgprogress":
            nonRecurre = false;
            if (data.payload.length > 0) {
              showMessage("", 1e3);
              for (const job of data.payload) {
                $$invalidate(
                  8,
                  progress[job["jobid"]] = job["progress"] >= 0 ? (job["progress"] * 100).toFixed(2) : "101",
                  progress
                );
              }
              $$invalidate(8, progress);
            }
        }
      }
    };
    window.addEventListener("message", rcvEvents);
    return () => {
      console.log("Escuta de evento destruída no jobs");
      window.removeEventListener("message", rcvEvents);
    };
  });
  onDestroy(() => {
    console.log("Jobs2 destroyed");
    if (interval) clearInterval(interval);
  });
  function listJobs(user, account, pagesize) {
    console.log("Novo tamanho de página " + pagesize);
    $$invalidate(14, loading = false);
    nonRecurre = false;
    let userOk = false;
    let accountOk = true;
    if (user.length === 4 || user.length === 0) userOk = true;
    if (account !== "") {
      accountOk = false;
      if (accounts.findIndex((val) => val === account) > -1) {
        accountOk = true;
      }
    }
    console.log(`Tipo de pesquisa para: ${user}, com userOk:${userOk} e ${account}, com ${accountOk}`);
    if (userOk && accountOk) {
      $$invalidate(14, loading = true);
      nonRecurre = false;
      vscode.postMessage({
        command: "listJobs",
        info: "Solicitação dos jobs correntes enviada para o painel",
        payload: { user, userOk, accountOk, account }
      });
      console.log("Mensagem listJobs enviada!");
    }
  }
  function killSelecteds() {
    showMessage("Comando para matar os jobs enviados, em breve a tela será atualizada");
    let selectedJobids = [];
    selectedRows.forEach((e, i) => {
      if (e === true && rows[i].user === getMeta("user")) {
        selectedJobids.push(rows[i].id);
      }
      if (selectedJobids.length > 0) {
        vscode.postMessage({
          command: "killJobs",
          info: "Matar jobs",
          payload: selectedJobids
        });
      }
      $$invalidate(4, selectedRows[i] = false, selectedRows);
    });
    showMessage("Os seguintes jobids serão removidos " + JSON.stringify(selectedJobids));
  }
  function moreInfo(jobid) {
    let elem = rows.findIndex((e) => e.id === jobid);
    $$invalidate(6, sidebar_show = false);
    $$invalidate(12, selection = {});
    jobInfoOrder.forEach((key) => {
      if (key) {
        const formattedVal = formatValue(key, rows[elem][key]);
        $$invalidate(12, selection[convertJobKeyName(key)] = formattedVal, selection);
      }
    });
    $$invalidate(6, sidebar_show = true);
  }
  const openLog = (jobid) => {
    showMessage("Procurando o arquivo...leva um tempo", 3e3);
    let elem = rows[rows.findIndex((e) => e.id === jobid)];
    vscode.postMessage({
      command: "openLog",
      info: "Carregar o Log de um elemento",
      payload: {
        jobid,
        chdir: elem.work_dir,
        name: elem.name,
        qos: elem.qos
      }
    });
  };
  const setPage = (p, inc = true) => {
    console.log("Pagina " + p);
    if (p >= 0 && p < pages.length) {
      $$invalidate(9, page = p);
      $$invalidate(11, currentPageRows = pages.length > 0 ? pages[page] : []);
    }
  };
  function openPortal(user) {
    vscode.postMessage({ command: "openUrlLink", args: user });
  }
  function openSystemFolder(folder) {
    if (folder) {
      vscode.postMessage({
        command: "openSystemFolder",
        info: "Abrir pasta no windows",
        payload: { chdir: folder }
      });
    }
  }
  function openVScodeFolder(folder) {
    if (folder) {
      vscode.postMessage({
        command: "openVScodeFolder",
        info: "Abrir pasta no windows",
        payload: { chdir: folder }
      });
    }
  }
  function getProgress() {
    if (rows.length > 0 && nonRecurre === false) {
      let jobs = currentPageRows.filter((e) => e.state === "RUNNING").map((e) => e.id).join(",");
      if (jobs && jobs.length > 0) {
        nonRecurre = true;
        vscode.postMessage({
          command: "cmgprogress",
          payload: { jobs, sameDate }
        });
      } else {
        showMessage("Nenhum job em execução");
      }
    }
  }
  function updateRunningJobs() {
    let jobs = currentPageRows.map((e) => e.id).join(",");
    vscode.postMessage({
      command: "updateJobs",
      info: "Solicitação de atualização dos jobs apresentados no painel",
      payload: { "user": selectedUser, jobs }
    });
  }
  function refresh(checked) {
    listJobs(selectedUser, selectedAccount, itemsPerPage);
    if (interval) clearInterval(interval);
    {
      console.log("setInterval armado");
      interval = setInterval(
        () => {
          updateRunningJobs();
          getProgress();
        },
        autoRefreshInterval
      );
    }
  }
  const func = (job, e) => e.id === job.id;
  function modal_show_binding(value) {
    modal_show = value;
    $$invalidate(5, modal_show);
  }
  const remove_handler2 = () => killSelecteds();
  function sidebardetails_show_binding(value) {
    sidebar_show = value;
    $$invalidate(6, sidebar_show);
  }
  function input0_input_handler() {
    selectedUser = this.value;
    $$invalidate(1, selectedUser);
  }
  function input1_input_handler() {
    selectedAccount = this.value;
    $$invalidate(2, selectedAccount);
  }
  const click_handler = () => listJobs(selectedUser, selectedAccount, itemsPerPage);
  const click_handler_1 = () => {
    selectedRows.forEach((e, i) => {
      if (rows[i].user === getMeta("user")) {
        $$invalidate(4, selectedRows[i] = true, selectedRows);
      }
    });
  };
  const click_handler_2 = () => {
    selectedRows.forEach((e, i) => $$invalidate(4, selectedRows[i] = false, selectedRows));
  };
  const click_handler_3 = () => {
    $$invalidate(5, modal_show = true);
  };
  const click_handler_4 = () => setPage(page - 5 > 0 ? page - 5 : 0, true);
  const click_handler_5 = (i) => setPage(page + i, false);
  const click_handler_6 = () => setPage(page + 5 > pages.length ? pages.length - 1 : page + 5, true);
  function input_change_handler() {
    sameDate = this.checked;
    $$invalidate(15, sameDate);
  }
  function input_change_handler_1(job) {
    selectedRows[rows.findIndex((e) => e.id === job.id)] = this.checked;
    $$invalidate(4, selectedRows);
  }
  const click_handler_7 = (job) => {
    moreInfo(job.id);
  };
  const click_handler_8 = (job) => {
    openPortal(job.user);
  };
  const click_handler_9 = (job) => openLog(job.id);
  const click_handler_10 = (job) => openLog(job.id);
  const click_handler_11 = (job) => openSystemFolder(job.work_dir);
  const click_handler_12 = (job) => openVScodeFolder(job.work_dir);
  $$self.$$set = ($$props2) => {
    if ("itemsPerPage" in $$props2) $$invalidate(0, itemsPerPage = $$props2.itemsPerPage);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty[0] & /*selectedUser, selectedAccount, itemsPerPage*/
    7) {
      listJobs(selectedUser, selectedAccount, itemsPerPage);
    }
    if ($$self.$$.dirty[0] & /*selectedRows, rows*/
    24) {
      if (selectedRows) {
        let selectedJobids = [];
        selectedRows.forEach((e, i) => {
          if (e === true && rows[i].user === getMeta("user")) {
            selectedJobids.push(rows[i].id);
          }
        });
        console.log("Jobsids até então selecionados para morrer: " + JSON.stringify(selectedJobids));
      }
    }
  };
  refresh();
  return [
    itemsPerPage,
    selectedUser,
    selectedAccount,
    rows,
    selectedRows,
    modal_show,
    sidebar_show,
    statusMessage,
    progress,
    page,
    pages,
    currentPageRows,
    selection,
    localTickTack,
    loading,
    sameDate,
    listJobs,
    killSelecteds,
    moreInfo,
    openLog,
    setPage,
    openPortal,
    openSystemFolder,
    openVScodeFolder,
    getProgress,
    func,
    modal_show_binding,
    remove_handler2,
    sidebardetails_show_binding,
    input0_input_handler,
    input1_input_handler,
    click_handler,
    click_handler_1,
    click_handler_2,
    click_handler_3,
    click_handler_4,
    click_handler_5,
    click_handler_6,
    input_change_handler,
    input_change_handler_1,
    click_handler_7,
    click_handler_8,
    click_handler_9,
    click_handler_10,
    click_handler_11,
    click_handler_12
  ];
}
class Jobs2 extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$3, create_fragment$3, safe_not_equal, { itemsPerPage: 0 }, null, [-1, -1]);
  }
}
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
const { toString } = Object.prototype;
const { getPrototypeOf } = Object;
const kindOf = /* @__PURE__ */ ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
const typeOfTest = (type) => (thing) => typeof thing === type;
const { isArray } = Array;
const isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
const isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
const isString = typeOfTest("string");
const isFunction = typeOfTest("function");
const isNumber = typeOfTest("number");
const isObject = (thing) => thing !== null && typeof thing === "object";
const isBoolean = (thing) => thing === true || thing === false;
const isPlainObject = (val) => {
  if (kindOf(val) !== "object") {
    return false;
  }
  const prototype2 = getPrototypeOf(val);
  return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
};
const isDate = kindOfTest("Date");
const isFile = kindOfTest("File");
const isBlob = kindOfTest("Blob");
const isFileList = kindOfTest("FileList");
const isStream = (val) => isObject(val) && isFunction(val.pipe);
const isFormData = (thing) => {
  let kind;
  return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
  kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
};
const isURLSearchParams = kindOfTest("URLSearchParams");
const [isReadableStream, isRequest, isResponse, isHeaders] = ["ReadableStream", "Request", "Response", "Headers"].map(kindOfTest);
const trim = (str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
const _global = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
const isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge() {
  const { caseless } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  }, { allOwnKeys });
  return a;
};
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
const inherits = (constructor, superConstructor, props, descriptors2) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors2);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, "super", {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
const toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
const isTypedArray = /* @__PURE__ */ ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[Symbol.iterator];
  const iterator = generator.call(obj);
  let result;
  while ((result = iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
const isHTMLForm = kindOfTest("HTMLFormElement");
const toCamelCase = (str) => {
  return str.toLowerCase().replace(
    /[-_\s]([a-z\d])(\w*)/g,
    function replacer(m, p1, p2) {
      return p1.toUpperCase() + p2;
    }
  );
};
const hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
const isRegExp = kindOfTest("RegExp");
const reduceDescriptors = (obj, reducer) => {
  const descriptors2 = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors2, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
      return false;
    }
    const value = obj[name];
    if (!isFunction(value)) return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
const noop = () => {
};
const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
const ALPHA = "abcdefghijklmnopqrstuvwxyz";
const DIGIT = "0123456789";
const ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};
const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = "";
  const { length } = alphabet;
  while (size--) {
    str += alphabet[Math.random() * length | 0];
  }
  return str;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === "FormData" && thing[Symbol.iterator]);
}
const toJSONObject = (obj) => {
  const stack = new Array(10);
  const visit = (source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }
      if (!("toJSON" in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = void 0;
        return target;
      }
    }
    return source;
  };
  return visit(obj, 0);
};
const isAsyncFn = kindOfTest("AsyncFunction");
const isThenable = (thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({ source, data }) => {
      if (source === _global && data === token) {
        callbacks.length && callbacks.shift()();
      }
    }, false);
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(
  typeof setImmediate === "function",
  isFunction(_global.postMessage)
);
const asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
const utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  ALPHABET,
  generateString,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap
};
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack;
  }
  this.message = message;
  this.name = "AxiosError";
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  if (response) {
    this.response = response;
    this.status = response.status ? response.status : null;
  }
}
utils$1.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: utils$1.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
});
const prototype$1 = AxiosError.prototype;
const descriptors = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL"
  // eslint-disable-next-line func-names
].forEach((code) => {
  descriptors[code] = { value: code };
});
Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype$1, "isAxiosError", { value: true });
AxiosError.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype$1);
  utils$1.toFlatObject(error, axiosError, function filter2(obj) {
    return obj !== Error.prototype;
  }, (prop) => {
    return prop !== "isAxiosError";
  });
  AxiosError.call(axiosError, error.message, code, config, request, response);
  axiosError.cause = error;
  axiosError.name = error.name;
  customProps && Object.assign(axiosError, customProps);
  return axiosError;
};
const httpAdapter = null;
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}
function removeBrackets(key) {
  return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}
const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new FormData();
  options = utils$1.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    return !utils$1.isUndefined(source[option]);
  });
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
  if (!utils$1.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils$1.isDate(value)) {
      return value.toISOString();
    }
    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError("Blob is not supported. Use a Buffer instead.");
    }
    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (value && !path && typeof value === "object") {
      if (utils$1.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path) {
    if (utils$1.isUndefined(value)) return;
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils$1.forEach(value, function each(el, key) {
      const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
        formData,
        el,
        utils$1.isString(key) ? key.trim() : key,
        path,
        exposedHelpers
      );
      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });
    stack.pop();
  }
  if (!utils$1.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
function encode$1(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params2, options) {
  this._pairs = [];
  params2 && toFormData(params2, this, options);
}
const prototype = AxiosURLSearchParams.prototype;
prototype.append = function append2(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString2(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode$1);
  } : encode$1;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
function buildURL(url, params2, options) {
  if (!params2) {
    return url;
  }
  const _encode = options && options.encode || encode;
  const serializeFn = options && options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params2, options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params2) ? params2.toString() : new AxiosURLSearchParams(params2, options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils$1.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};
const URLSearchParams$1 = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams;
const FormData$1 = typeof FormData !== "undefined" ? FormData : null;
const Blob$1 = typeof Blob !== "undefined" ? Blob : null;
const platform$1 = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams$1,
    FormData: FormData$1,
    Blob: Blob$1
  },
  protocols: ["http", "https", "file", "blob", "url", "data"]
};
const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
const _navigator = typeof navigator === "object" && navigator || void 0;
const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
const hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
const origin = hasBrowserEnv && window.location.href || "http://localhost";
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv,
  hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv,
  navigator: _navigator,
  origin
}, Symbol.toStringTag, { value: "Module" }));
const platform = {
  ...utils,
  ...platform$1
};
function toURLEncodedForm(data, options) {
  return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
    visitor: function(value, key, path, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    }
  }, options));
}
function parsePropPath(name) {
  return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils$1.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils$1.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};
    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (0, JSON.stringify)(rawValue);
}
const defaults = {
  transitional: transitionalDefaults,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || "";
    const hasJSONContentType = contentType.indexOf("application/json") > -1;
    const isObjectPayload = utils$1.isObject(data);
    if (isObjectPayload && utils$1.isHTMLForm(data)) {
      data = new FormData(data);
    }
    const isFormData2 = utils$1.isFormData(data);
    if (isFormData2) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
    }
    if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
      return data;
    }
    if (utils$1.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils$1.isURLSearchParams(data)) {
      headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return data.toString();
    }
    let isFileList2;
    if (isObjectPayload) {
      if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }
      if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData(
          isFileList2 ? { "files[]": data } : data,
          _FormData && new _FormData(),
          this.formSerializer
        );
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType("application/json", false);
      return stringifySafely(data);
    }
    return data;
  }],
  transformResponse: [function transformResponse(data) {
    const transitional2 = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
    const JSONRequested = this.responseType === "json";
    if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
      return data;
    }
    if (data && utils$1.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === "SyntaxError") {
            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }
    return data;
  }],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
utils$1.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
  defaults.headers[method] = {};
});
const ignoreDuplicateOf = utils$1.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
const parseHeaders = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};
const $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils$1.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils$1.isString(value)) return;
  if (utils$1.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils$1.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error("header name must be a non-empty string");
      }
      const key = utils$1.findKey(self2, lHeader);
      if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isHeaders(header)) {
      for (const [key, value] of header.entries()) {
        setHeader(value, key, rewrite);
      }
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils$1.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils$1.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype2, _header);
        accessors[lHeader] = true;
      }
    }
    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
}
AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
utils$1.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils$1.freezeMethods(AxiosHeaders);
function transformData(fns, response) {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders.from(context.headers);
  let data = context.data;
  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}
function CanceledError(message, config, request) {
  AxiosError.call(this, message == null ? "canceled" : message, AxiosError.ERR_CANCELED, config, request);
  this.name = "CanceledError";
}
utils$1.inherits(CanceledError, AxiosError, {
  __CANCEL__: true
});
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError(
      "Request failed with status code " + response.status,
      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}
function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || "";
}
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return function push(chunkLength) {
    const now2 = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now2;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now2;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now2 - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now2 - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now2 = Date.now()) => {
    timestamp = now2;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  };
  const throttled = (...args) => {
    const now2 = Date.now();
    const passed = now2 - timestamp;
    if (passed >= threshold) {
      invoke(args, now2);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush2 = () => lastArgs && invoke(lastArgs);
  return [throttled, flush2];
}
const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);
  return throttle((e) => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : void 0;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};
const asyncDecorator = (fn) => (...args) => utils$1.asap(() => fn(...args));
const isURLSameOrigin = platform.hasStandardBrowserEnv ? (
  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  function standardBrowserEnv() {
    const msie = platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent);
    const urlParsingNode = document.createElement("a");
    let originURL;
    function resolveURL(url) {
      let href = url;
      if (msie) {
        urlParsingNode.setAttribute("href", href);
        href = urlParsingNode.href;
      }
      urlParsingNode.setAttribute("href", href);
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, "") : "",
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, "") : "",
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, "") : "",
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: urlParsingNode.pathname.charAt(0) === "/" ? urlParsingNode.pathname : "/" + urlParsingNode.pathname
      };
    }
    originURL = resolveURL(window.location.href);
    return function isURLSameOrigin2(requestURL) {
      const parsed = utils$1.isString(requestURL) ? resolveURL(requestURL) : requestURL;
      return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
    };
  }()
) : (
  // Non standard browser envs (web workers, react-native) lack needed support.
  /* @__PURE__ */ function nonStandardBrowserEnv() {
    return function isURLSameOrigin2() {
      return true;
    };
  }()
);
const cookies = platform.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path, domain, secure) {
      const cookie = [name + "=" + encodeURIComponent(value)];
      utils$1.isNumber(expires) && cookie.push("expires=" + new Date(expires).toGMTString());
      utils$1.isString(path) && cookie.push("path=" + path);
      utils$1.isString(domain) && cookie.push("domain=" + domain);
      secure === true && cookie.push("secure");
      document.cookie = cookie.join("; ");
    },
    read(name) {
      const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
      return match ? decodeURIComponent(match[3]) : null;
    },
    remove(name) {
      this.write(name, "", Date.now() - 864e5);
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
);
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
const headersToObject = (thing) => thing instanceof AxiosHeaders ? { ...thing } : thing;
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({ caseless }, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(void 0, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
  };
  utils$1.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge2 = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge2(config1[prop], config2[prop], prop);
    utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}
const resolveConfig = (config) => {
  const newConfig = mergeConfig({}, config);
  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
  newConfig.headers = headers = AxiosHeaders.from(headers);
  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url), config.params, config.paramsSerializer);
  if (auth) {
    headers.set(
      "Authorization",
      "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
    );
  }
  let contentType;
  if (utils$1.isFormData(data)) {
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(void 0);
    } else if ((contentType = headers.getContentType()) !== false) {
      const [type, ...tokens] = contentType ? contentType.split(";").map((token) => token.trim()).filter(Boolean) : [];
      headers.setContentType([type || "multipart/form-data", ...tokens].join("; "));
    }
  }
  if (platform.hasStandardBrowserEnv) {
    withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin(newConfig.url)) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
};
const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
const xhrAdapter = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders.from(
        "getAllResponseHeaders" in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError("Request aborted", AxiosError.ECONNABORTED, config, request));
      request = null;
    };
    request.onerror = function handleError() {
      reject(new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, request));
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError(
        timeoutErrorMessage,
        transitional2.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
        config,
        request
      ));
      request = null;
    };
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils$1.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
        request.abort();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && platform.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError("Unsupported protocol " + protocol + ":", AxiosError.ERR_BAD_REQUEST, config));
      return;
    }
    request.send(requestData || null);
  });
};
const composeSignals = (signals, timeout) => {
  const { length } = signals = signals ? signals.filter(Boolean) : [];
  if (timeout || length) {
    let controller = new AbortController();
    let aborted;
    const onabort = function(reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError ? err : new CanceledError(err instanceof Error ? err.message : err));
      }
    };
    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError(`timeout ${timeout} of ms exceeded`, AxiosError.ETIMEDOUT));
    }, timeout);
    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal2) => {
          signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    };
    signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
    const { signal } = controller;
    signal.unsubscribe = () => utils$1.asap(unsubscribe);
    return signal;
  }
};
const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
const readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
const readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }
  const reader = stream.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
const trackStream = (stream, chunkSize, onProgress, onFinish) => {
  const iterator = readBytes(stream, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done: done2, value } = await iterator.next();
        if (done2) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator.return();
    }
  }, {
    highWaterMark: 2
  });
};
const isFetchSupported = typeof fetch === "function" && typeof Request === "function" && typeof Response === "function";
const isReadableStreamSupported = isFetchSupported && typeof ReadableStream === "function";
const encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Response(str).arrayBuffer()));
const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
const supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;
  const hasContentType = new Request(platform.origin, {
    body: new ReadableStream(),
    method: "POST",
    get duplex() {
      duplexAccessed = true;
      return "half";
    }
  }).headers.has("Content-Type");
  return duplexAccessed && !hasContentType;
});
const DEFAULT_CHUNK_SIZE = 64 * 1024;
const supportsResponseStream = isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response("").body));
const resolvers = {
  stream: supportsResponseStream && ((res) => res.body)
};
isFetchSupported && ((res) => {
  ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
    !resolvers[type] && (resolvers[type] = utils$1.isFunction(res[type]) ? (res2) => res2[type]() : (_, config) => {
      throw new AxiosError(`Response type '${type}' is not supported`, AxiosError.ERR_NOT_SUPPORT, config);
    });
  });
})(new Response());
const getBodyLength = async (body) => {
  if (body == null) {
    return 0;
  }
  if (utils$1.isBlob(body)) {
    return body.size;
  }
  if (utils$1.isSpecCompliantForm(body)) {
    const _request = new Request(platform.origin, {
      method: "POST",
      body
    });
    return (await _request.arrayBuffer()).byteLength;
  }
  if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
    return body.byteLength;
  }
  if (utils$1.isURLSearchParams(body)) {
    body = body + "";
  }
  if (utils$1.isString(body)) {
    return (await encodeText(body)).byteLength;
  }
};
const resolveBodyLength = async (headers, body) => {
  const length = utils$1.toFiniteNumber(headers.getContentLength());
  return length == null ? getBodyLength(body) : length;
};
const fetchAdapter = isFetchSupported && (async (config) => {
  let {
    url,
    method,
    data,
    signal,
    cancelToken,
    timeout,
    onDownloadProgress,
    onUploadProgress,
    responseType,
    headers,
    withCredentials = "same-origin",
    fetchOptions
  } = resolveConfig(config);
  responseType = responseType ? (responseType + "").toLowerCase() : "text";
  let composedSignal = composeSignals([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
  let request;
  const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
    composedSignal.unsubscribe();
  });
  let requestContentLength;
  try {
    if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
      let _request = new Request(url, {
        method: "POST",
        body: data,
        duplex: "half"
      });
      let contentTypeHeader;
      if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
        headers.setContentType(contentTypeHeader);
      }
      if (_request.body) {
        const [onProgress, flush2] = progressEventDecorator(
          requestContentLength,
          progressEventReducer(asyncDecorator(onUploadProgress))
        );
        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush2);
      }
    }
    if (!utils$1.isString(withCredentials)) {
      withCredentials = withCredentials ? "include" : "omit";
    }
    const isCredentialsSupported = "credentials" in Request.prototype;
    request = new Request(url, {
      ...fetchOptions,
      signal: composedSignal,
      method: method.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      credentials: isCredentialsSupported ? withCredentials : void 0
    });
    let response = await fetch(request);
    const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
    if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
      const options = {};
      ["status", "statusText", "headers"].forEach((prop) => {
        options[prop] = response[prop];
      });
      const responseContentLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
      const [onProgress, flush2] = onDownloadProgress && progressEventDecorator(
        responseContentLength,
        progressEventReducer(asyncDecorator(onDownloadProgress), true)
      ) || [];
      response = new Response(
        trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
          flush2 && flush2();
          unsubscribe && unsubscribe();
        }),
        options
      );
    }
    responseType = responseType || "text";
    let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](response, config);
    !isStreamResponse && unsubscribe && unsubscribe();
    return await new Promise((resolve, reject) => {
      settle(resolve, reject, {
        data: responseData,
        headers: AxiosHeaders.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config,
        request
      });
    });
  } catch (err) {
    unsubscribe && unsubscribe();
    if (err && err.name === "TypeError" && /fetch/i.test(err.message)) {
      throw Object.assign(
        new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, request),
        {
          cause: err.cause || err
        }
      );
    }
    throw AxiosError.from(err, err && err.code, config, request);
  }
});
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: fetchAdapter
};
utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e) {
    }
    Object.defineProperty(fn, "adapterName", { value });
  }
});
const renderReason = (reason) => `- ${reason}`;
const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
const adapters = {
  getAdapter: (adapters2) => {
    adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
    const { length } = adapters2;
    let nameOrAdapter;
    let adapter;
    const rejectedReasons = {};
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters2[i];
      let id;
      adapter = nameOrAdapter;
      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
        if (adapter === void 0) {
          throw new AxiosError(`Unknown adapter '${id}'`);
        }
      }
      if (adapter) {
        break;
      }
      rejectedReasons[id || "#" + i] = adapter;
    }
    if (!adapter) {
      const reasons = Object.entries(rejectedReasons).map(
        ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
      );
      let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
      throw new AxiosError(
        `There is no suitable adapter to dispatch the request ` + s,
        "ERR_NOT_SUPPORT"
      );
    }
    return adapter;
  },
  adapters: knownAdapters
};
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders.from(config.headers);
  config.data = transformData.call(
    config,
    config.transformRequest
  );
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters.getAdapter(config.adapter || defaults.adapter);
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );
    response.headers = AxiosHeaders.from(response.headers);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  });
}
const VERSION = "1.7.7";
const validators$1 = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators$1[type] = function validator2(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
const deprecatedWarnings = {};
validators$1.transitional = function transitional(validator2, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator2 === false) {
      throw new AxiosError(
        formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
        AxiosError.ERR_DEPRECATED
      );
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(
        formatMessage(
          opt,
          " has been deprecated since v" + version + " and will be removed in the near future"
        )
      );
    }
    return validator2 ? validator2(value, opt, opts) : true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError("options must be an object", AxiosError.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator2 = schema[opt];
    if (validator2) {
      const value = options[opt];
      const result = value === void 0 || validator2(value, opt, options);
      if (result !== true) {
        throw new AxiosError("option " + opt + " must be " + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError("Unknown option " + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}
const validator = {
  assertOptions,
  validators: validators$1
};
const validators = validator.validators;
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy;
        Error.captureStackTrace ? Error.captureStackTrace(dummy = {}) : dummy = new Error();
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
            err.stack += "\n" + stack;
          }
        } catch (e) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) {
      validator.assertOptions(transitional2, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean)
      }, false);
    }
    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(paramsSerializer, {
          encode: validators.function,
          serialize: validators.function
        }, true);
      }
    }
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils$1.merge(
      headers.common,
      headers[config.method]
    );
    headers && utils$1.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (method) => {
        delete headers[method];
      }
    );
    config.headers = AxiosHeaders.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise2;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;
      promise2 = Promise.resolve(config);
      while (i < len) {
        promise2 = promise2.then(chain[i++], chain[i++]);
      }
      return promise2;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    i = 0;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise2 = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise2 = promise2.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise2;
  }
  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}
utils$1.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});
utils$1.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url,
        data
      }));
    };
  }
  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});
class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise2 = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise2.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise2;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError(message, config, request);
      resolvePromise(token.reason);
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}
function isAxiosError(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
}
const HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});
function createInstance(defaultConfig) {
  const context = new Axios(defaultConfig);
  const instance2 = bind(Axios.prototype.request, context);
  utils$1.extend(instance2, Axios.prototype, context, { allOwnKeys: true });
  utils$1.extend(instance2, context, null, { allOwnKeys: true });
  instance2.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };
  return instance2;
}
const axios = createInstance(defaults);
axios.Axios = Axios;
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData;
axios.AxiosError = AxiosError;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread;
axios.isAxiosError = isAxiosError;
axios.mergeConfig = mergeConfig;
axios.AxiosHeaders = AxiosHeaders;
axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters.getAdapter;
axios.HttpStatusCode = HttpStatusCode;
axios.default = axios;
const urlSearch = "http://localhost:%(proxyPort)s/api/slurm/_search";
const query = `{
    "from": %(from)s,
    "size": %(size)s,
    "sort": [
      {"@submit": {"order": "desc"}}
    ],
    "query":  {
        "bool": {
            "must": [

                {
                    "range": {
                        "@end" : {
                            "gte": "%(startDate)sT00:00:00.000Z",
                            "lte": "%(endDate)sT23:59:59.000Z",
                            "time_zone" : "America/Sao_Paulo"
                        }
                    }
                }
                %(filterUser)s
                %(filterAccount)s
                %(filterState)s
            ]
        }
    },
    "_source": ["@submit", "nodes", "account", "username",
            "cluster", "elapsed", "state", "jobid", "job_name",
            "work_dir", "cpus_per_task", "partition", "queue_wait"]
}`;
const params = {
  "filterUser": "",
  "from": "",
  "size": "",
  "startDate": "",
  "endDate": "",
  "filterState": "",
  "filterAccount": ""
};
class KibanaDataSource {
  constructor(user, account, days = 0, state = "", proxyPort = "5173") {
    __publicField(this, "_proxyPort");
    __publicField(this, "_hitsTotal");
    __publicField(this, "_maxPages");
    __publicField(this, "_startDate");
    __publicField(this, "_endDate");
    __publicField(this, "_from");
    __publicField(this, "_size");
    __publicField(this, "_account");
    __publicField(this, "_filterState");
    __publicField(this, "_filterUser");
    __publicField(this, "_filterAccount");
    __publicField(this, "getData", async (pageSize, from = 0) => {
      this._size = pageSize;
      this._from = from;
      params.startDate = this._startDate;
      params.endDate = this._endDate;
      params.from = this._from.toString();
      params.size = this._size.toString();
      params.filterUser = this._filterUser;
      params.filterState = this._filterState;
      params.filterAccount = this._filterAccount;
      console.log(JSON.stringify(params));
      let q = query;
      q = q.replace("%(startDate)s", params.startDate);
      q = q.replace("%(endDate)s", params.endDate);
      q = q.replace("%(from)s", params.from);
      q = q.replace("%(size)s", params.size);
      q = q.replace("%(filterUser)s", params.filterUser);
      q = q.replace("%(filterState)s", params.filterState);
      q = q.replace("%(filterAccount)s", params.filterAccount);
      const response = await axios({
        method: "POST",
        url: urlSearch.replace("%(proxyPort)s", this._proxyPort),
        data: JSON.parse(q),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
      if (response && response.status === 200 && response.statusText === "OK") {
        const respJson = await response.data;
        if (respJson.hits.hits.length > 0) {
          this._hitsTotal = respJson.hits.total.value;
          this._maxPages = this._hitsTotal > 0 && pageSize > 0 ? this._hitsTotal / pageSize : 0;
          return respJson;
        }
      }
    });
    __publicField(this, "print", async (resp, _page) => {
      if (resp.hits.total.value > 0) {
        for (let idx = 0; idx < resp.hits.hits.length; idx++) {
          resp.hits.hits[idx]._source;
        }
      }
    });
    this._proxyPort = proxyPort;
    this._hitsTotal = 0;
    this._maxPages = 0;
    this._account = account;
    this._from = 0;
    this._size = 10;
    this._filterUser = user;
    this._filterState = "";
    this._filterAccount = "";
    let first = /* @__PURE__ */ new Date();
    const endDate = /* @__PURE__ */ new Date();
    first.setDate(first.getDate() - days);
    this._startDate = first.toISOString().split("T")[0];
    this._endDate = endDate.toISOString().split("T")[0];
    if (state.length > 0) {
      this._filterState = `, { "match_phrase": {"state": "${state}"}}`;
    }
    if (account.length > 0) {
      this._filterAccount = `, { "match_phrase": { "account": "${account}" }}`;
    }
    if (user.length > 0) {
      this._filterUser = `, { "match": {"username.keyword" : "${user}" }}`;
    }
  }
}
(async () => {
  const kibana = new KibanaDataSource("", "atp-ro", 60, "COMPLETED");
  let from = 0;
  while (1) {
    const resp = await kibana.getData(10, from * 10);
    if (!resp || resp.hits.hits.length === 0) {
      break;
    }
    resp && kibana.print(resp, from);
    from += 1;
  }
  console.log(`Total de entradas: ${kibana._hitsTotal}`);
})();
function get_each_context(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[43] = list[i];
  child_ctx[45] = i;
  return child_ctx;
}
function get_each_context_1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[46] = list[i];
  child_ctx[48] = i;
  return child_ctx;
}
function create_default_slot(ctx) {
  let h4;
  return {
    c() {
      h4 = element("h4");
      h4.textContent = "Detalhes";
    },
    m(target, anchor) {
      insert(target, h4, anchor);
    },
    p: noop$1,
    d(detaching) {
      if (detaching) {
        detach(h4);
      }
    }
  };
}
function create_if_block_3(ctx) {
  let each_1_anchor;
  let each_value_1 = ensure_array_like(Array(
    /*totalPages*/
    ctx[9] > 5 ? 5 : (
      /*totalPages*/
      ctx[9]
    )
  ).fill(1));
  let each_blocks = [];
  for (let i = 0; i < each_value_1.length; i += 1) {
    each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
  }
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*setPage, page, totalPages*/
      131840) {
        each_value_1 = ensure_array_like(Array(
          /*totalPages*/
          ctx2[9] > 5 ? 5 : (
            /*totalPages*/
            ctx2[9]
          )
        ).fill(1));
        let i;
        for (i = 0; i < each_value_1.length; i += 1) {
          const child_ctx = get_each_context_1(ctx2, each_value_1, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_1(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_1.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(each_1_anchor);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_if_block_4(ctx) {
  let button;
  let t0_value = (
    /*page*/
    ctx[8] + /*i*/
    ctx[48] + 1 + ""
  );
  let t0;
  let t1;
  let mounted;
  let dispose;
  function click_handler_1() {
    return (
      /*click_handler_1*/
      ctx[29](
        /*i*/
        ctx[48]
      )
    );
  }
  return {
    c() {
      button = element("button");
      t0 = text(t0_value);
      t1 = space();
      attr(button, "type", "button");
      attr(button, "class", "btn-page-number svelte-12qzibs");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, t0);
      append(button, t1);
      if (!mounted) {
        dispose = listen(button, "click", click_handler_1);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*page*/
      256 && t0_value !== (t0_value = /*page*/
      ctx[8] + /*i*/
      ctx[48] + 1 + "")) set_data(t0, t0_value);
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_each_block_1(ctx) {
  let if_block_anchor;
  let if_block = (
    /*page*/
    ctx[8] + /*i*/
    ctx[48] < /*totalPages*/
    ctx[9] && create_if_block_4(ctx)
  );
  return {
    c() {
      if (if_block) if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if (if_block) if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (
        /*page*/
        ctx2[8] + /*i*/
        ctx2[48] < /*totalPages*/
        ctx2[9]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_4(ctx2);
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(if_block_anchor);
      }
      if (if_block) if_block.d(detaching);
    }
  };
}
function create_if_block_2(ctx) {
  let span;
  let t0;
  let t1;
  return {
    c() {
      span = element("span");
      t0 = text("total de páginas: ");
      t1 = text(
        /*totalPages*/
        ctx[9]
      );
      attr(span, "class", "text svelte-12qzibs");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t0);
      append(span, t1);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*totalPages*/
      512) set_data(
        t1,
        /*totalPages*/
        ctx2[9]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_1$1(ctx) {
  let t0;
  let t1;
  let sep;
  let current;
  sep = new Separator({ props: { w: 2 } });
  return {
    c() {
      t0 = text("Carregando...");
      t1 = text(
        /*localTickTack*/
        ctx[12]
      );
      create_component(sep.$$.fragment);
    },
    m(target, anchor) {
      insert(target, t0, anchor);
      insert(target, t1, anchor);
      mount_component(sep, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      if (!current || dirty[0] & /*localTickTack*/
      4096) set_data(
        t1,
        /*localTickTack*/
        ctx2[12]
      );
    },
    i(local) {
      if (current) return;
      transition_in(sep.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(sep.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(t1);
      }
      destroy_component(sep, detaching);
    }
  };
}
function create_else_block$2(ctx) {
  let div;
  let t_value = (
    /*job*/
    ctx[43]._source.job_name + ""
  );
  let t;
  return {
    c() {
      div = element("div");
      t = text(t_value);
      attr(div, "class", "grid1-column svelte-12qzibs");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*rows*/
      128 && t_value !== (t_value = /*job*/
      ctx2[43]._source.job_name + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block$2(ctx) {
  let div;
  let a;
  let t_value = (
    /*job*/
    ctx[43]._source.job_name + ""
  );
  let t;
  let mounted;
  let dispose;
  function click_handler_5() {
    return (
      /*click_handler_5*/
      ctx[33](
        /*job*/
        ctx[43]
      )
    );
  }
  return {
    c() {
      div = element("div");
      a = element("a");
      t = text(t_value);
      attr(a, "class", "svelte-12qzibs");
      attr(div, "class", "grid1-column svelte-12qzibs");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, a);
      append(a, t);
      if (!mounted) {
        dispose = listen(a, "click", click_handler_5);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*rows*/
      128 && t_value !== (t_value = /*job*/
      ctx[43]._source.job_name + "")) set_data(t, t_value);
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_each_block(key_1, ctx) {
  let div0;
  let a0;
  let t0_value = (
    /*job*/
    ctx[43]._source.jobid + ""
  );
  let t0;
  let t1;
  let div1;
  let a1;
  let t2_value = (
    /*job*/
    ctx[43]._source.username + ""
  );
  let t2;
  let t3;
  let div2;
  let t4_value = (
    /*job*/
    ctx[43]._source.account + ""
  );
  let t4;
  let t5;
  let div3;
  let t6_value = (
    /*job*/
    ctx[43]._source.state + ""
  );
  let t6;
  let t7;
  let div4;
  let t8_value = convertSeconds2Short(
    /*job*/
    ctx[43]._source.elapsed
  ) + "";
  let t8;
  let t9;
  let div5;
  let t10_value = convertISODate2LocalTime(
    /*job*/
    ctx[43]._source["@submit"]
  ) + "";
  let t10;
  let t11;
  let show_if;
  let t12;
  let div6;
  let a2;
  let t14;
  let sep0;
  let t15;
  let sep1;
  let t16;
  let a3;
  let t18;
  let current;
  let mounted;
  let dispose;
  function click_handler_3() {
    return (
      /*click_handler_3*/
      ctx[31](
        /*job*/
        ctx[43]
      )
    );
  }
  function click_handler_4() {
    return (
      /*click_handler_4*/
      ctx[32](
        /*job*/
        ctx[43]
      )
    );
  }
  function select_block_type(ctx2, dirty) {
    if (dirty[0] & /*rows*/
    128) show_if = null;
    if (show_if == null) show_if = !!/*linkAvailable*/
    ctx2[15](
      /*job*/
      ctx2[43]._source
    );
    if (show_if) return create_if_block$2;
    return create_else_block$2;
  }
  let current_block_type = select_block_type(ctx, [-1, -1]);
  let if_block = current_block_type(ctx);
  function click_handler_6() {
    return (
      /*click_handler_6*/
      ctx[34](
        /*job*/
        ctx[43]
      )
    );
  }
  sep0 = new Separator({ props: { w: 1 } });
  sep1 = new Separator({ props: { w: 1 } });
  function click_handler_7() {
    return (
      /*click_handler_7*/
      ctx[35](
        /*job*/
        ctx[43]
      )
    );
  }
  return {
    key: key_1,
    first: null,
    c() {
      div0 = element("div");
      a0 = element("a");
      t0 = text(t0_value);
      t1 = space();
      div1 = element("div");
      a1 = element("a");
      t2 = text(t2_value);
      t3 = space();
      div2 = element("div");
      t4 = text(t4_value);
      t5 = space();
      div3 = element("div");
      t6 = text(t6_value);
      t7 = space();
      div4 = element("div");
      t8 = text(t8_value);
      t9 = space();
      div5 = element("div");
      t10 = text(t10_value);
      t11 = space();
      if_block.c();
      t12 = space();
      div6 = element("div");
      a2 = element("a");
      a2.textContent = "Win Explorer";
      t14 = space();
      create_component(sep0.$$.fragment);
      t15 = text("|");
      create_component(sep1.$$.fragment);
      t16 = space();
      a3 = element("a");
      a3.textContent = "VSCode";
      t18 = space();
      attr(a0, "href", "/");
      attr(a0, "class", "svelte-12qzibs");
      attr(div0, "class", "grid1-column svelte-12qzibs");
      attr(a1, "href", "/");
      attr(a1, "class", "svelte-12qzibs");
      attr(div1, "class", "grid1-column svelte-12qzibs");
      attr(div2, "class", "grid1-column svelte-12qzibs");
      attr(div3, "class", "grid1-column svelte-12qzibs");
      attr(div4, "class", "grid1-column svelte-12qzibs");
      attr(div5, "class", "grid1-column svelte-12qzibs");
      attr(a2, "class", "svelte-12qzibs");
      attr(a3, "class", "svelte-12qzibs");
      attr(div6, "class", "grid1-column svelte-12qzibs");
      this.first = div0;
    },
    m(target, anchor) {
      insert(target, div0, anchor);
      append(div0, a0);
      append(a0, t0);
      insert(target, t1, anchor);
      insert(target, div1, anchor);
      append(div1, a1);
      append(a1, t2);
      insert(target, t3, anchor);
      insert(target, div2, anchor);
      append(div2, t4);
      insert(target, t5, anchor);
      insert(target, div3, anchor);
      append(div3, t6);
      insert(target, t7, anchor);
      insert(target, div4, anchor);
      append(div4, t8);
      insert(target, t9, anchor);
      insert(target, div5, anchor);
      append(div5, t10);
      insert(target, t11, anchor);
      if_block.m(target, anchor);
      insert(target, t12, anchor);
      insert(target, div6, anchor);
      append(div6, a2);
      append(div6, t14);
      mount_component(sep0, div6, null);
      append(div6, t15);
      mount_component(sep1, div6, null);
      append(div6, t16);
      append(div6, a3);
      append(div6, t18);
      current = true;
      if (!mounted) {
        dispose = [
          listen(a0, "click", click_handler_3),
          listen(a1, "click", click_handler_4),
          listen(a2, "click", click_handler_6),
          listen(a3, "click", click_handler_7)
        ];
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if ((!current || dirty[0] & /*rows*/
      128) && t0_value !== (t0_value = /*job*/
      ctx[43]._source.jobid + "")) set_data(t0, t0_value);
      if ((!current || dirty[0] & /*rows*/
      128) && t2_value !== (t2_value = /*job*/
      ctx[43]._source.username + "")) set_data(t2, t2_value);
      if ((!current || dirty[0] & /*rows*/
      128) && t4_value !== (t4_value = /*job*/
      ctx[43]._source.account + "")) set_data(t4, t4_value);
      if ((!current || dirty[0] & /*rows*/
      128) && t6_value !== (t6_value = /*job*/
      ctx[43]._source.state + "")) set_data(t6, t6_value);
      if ((!current || dirty[0] & /*rows*/
      128) && t8_value !== (t8_value = convertSeconds2Short(
        /*job*/
        ctx[43]._source.elapsed
      ) + "")) set_data(t8, t8_value);
      if ((!current || dirty[0] & /*rows*/
      128) && t10_value !== (t10_value = convertISODate2LocalTime(
        /*job*/
        ctx[43]._source["@submit"]
      ) + "")) set_data(t10, t10_value);
      if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
        if_block.p(ctx, dirty);
      } else {
        if_block.d(1);
        if_block = current_block_type(ctx);
        if (if_block) {
          if_block.c();
          if_block.m(t12.parentNode, t12);
        }
      }
    },
    i(local) {
      if (current) return;
      transition_in(sep0.$$.fragment, local);
      transition_in(sep1.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(sep0.$$.fragment, local);
      transition_out(sep1.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div0);
        detach(t1);
        detach(div1);
        detach(t3);
        detach(div2);
        detach(t5);
        detach(div3);
        detach(t7);
        detach(div4);
        detach(t9);
        detach(div5);
        detach(t11);
        detach(t12);
        detach(div6);
      }
      if_block.d(detaching);
      destroy_component(sep0);
      destroy_component(sep1);
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_fragment$2(ctx) {
  let main;
  let modal;
  let updating_show;
  let t0;
  let div13;
  let sidebardetails;
  let updating_show_1;
  let t1;
  let div1;
  let div0;
  let label0;
  let t3;
  let input0;
  let t4;
  let sep0;
  let t5;
  let label1;
  let t7;
  let input1;
  let t8;
  let sep1;
  let t9;
  let span0;
  let label2;
  let t10;
  let input2;
  let t11;
  let span1;
  let select;
  let option0;
  let option1;
  let option2;
  let option3;
  let option4;
  let t17;
  let sep2;
  let t18;
  let button0;
  let t20;
  let t21;
  let button1;
  let t23;
  let sep3;
  let t24;
  let span2;
  let t25;
  let t26;
  let t27;
  let div2;
  let t28;
  let html_tag;
  let raw_value = (
    /*statusMessage*/
    ctx[6].split(":")[0] + ""
  );
  let t29;
  let div12;
  let toasts2;
  let t30;
  let div11;
  let div3;
  let t32;
  let div4;
  let t34;
  let div5;
  let t36;
  let div6;
  let t38;
  let div7;
  let t40;
  let div8;
  let t42;
  let div9;
  let t44;
  let div10;
  let t46;
  let each_blocks = [];
  let each_1_lookup = /* @__PURE__ */ new Map();
  let current;
  let mounted;
  let dispose;
  function modal_show_binding(value) {
    ctx[22](value);
  }
  let modal_props = { text: modal_question };
  if (
    /*modal_show*/
    ctx[4] !== void 0
  ) {
    modal_props.show = /*modal_show*/
    ctx[4];
  }
  modal = new Modal({ props: modal_props });
  binding_callbacks.push(() => bind$1(modal, "show", modal_show_binding));
  modal.$on("remove", remove_handler);
  function sidebardetails_show_binding(value) {
    ctx[23](value);
  }
  let sidebardetails_props = {
    selection: (
      /*selection*/
      ctx[10]
    ),
    $$slots: { default: [create_default_slot] },
    $$scope: { ctx }
  };
  if (
    /*sidebar_show*/
    ctx[5] !== void 0
  ) {
    sidebardetails_props.show = /*sidebar_show*/
    ctx[5];
  }
  sidebardetails = new SidebarDetails({ props: sidebardetails_props });
  binding_callbacks.push(() => bind$1(sidebardetails, "show", sidebardetails_show_binding));
  sep0 = new Separator({ props: { w: 1 } });
  sep1 = new Separator({ props: { w: 1 } });
  sep2 = new Separator({ props: { w: 2 } });
  let if_block0 = (
    /*rows*/
    ctx[7] && /*rows*/
    ctx[7].length > 0 && create_if_block_3(ctx)
  );
  sep3 = new Separator({ props: { w: 1 } });
  let if_block1 = (
    /*total_hits*/
    ctx[11] > 0 && create_if_block_2(ctx)
  );
  let if_block2 = (
    /*loading*/
    ctx[13] && create_if_block_1$1(ctx)
  );
  toasts2 = new Toasts({});
  let each_value = ensure_array_like(
    /*rows*/
    ctx[7]
  );
  const get_key = (ctx2) => (
    /*job*/
    ctx2[43]._source.jobid
  );
  for (let i = 0; i < each_value.length; i += 1) {
    let child_ctx = get_each_context(ctx, each_value, i);
    let key = get_key(child_ctx);
    each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
  }
  return {
    c() {
      main = element("main");
      create_component(modal.$$.fragment);
      t0 = space();
      div13 = element("div");
      create_component(sidebardetails.$$.fragment);
      t1 = space();
      div1 = element("div");
      div0 = element("div");
      label0 = element("label");
      label0.textContent = "Usuário:";
      t3 = space();
      input0 = element("input");
      t4 = space();
      create_component(sep0.$$.fragment);
      t5 = space();
      label1 = element("label");
      label1.textContent = "Account:";
      t7 = space();
      input1 = element("input");
      t8 = space();
      create_component(sep1.$$.fragment);
      t9 = space();
      span0 = element("span");
      label2 = element("label");
      t10 = text("Dias de histórico:\r\n                        ");
      input2 = element("input");
      t11 = space();
      span1 = element("span");
      select = element("select");
      option0 = element("option");
      option0.textContent = "Todos";
      option1 = element("option");
      option1.textContent = "Completos";
      option2 = element("option");
      option2.textContent = "Cancelados";
      option3 = element("option");
      option3.textContent = "Falharam";
      option4 = element("option");
      option4.textContent = "Erro no nó";
      t17 = space();
      create_component(sep2.$$.fragment);
      t18 = space();
      button0 = element("button");
      button0.textContent = "«";
      t20 = space();
      if (if_block0) if_block0.c();
      t21 = space();
      button1 = element("button");
      button1.textContent = "»";
      t23 = space();
      create_component(sep3.$$.fragment);
      t24 = space();
      span2 = element("span");
      t25 = text(
        /*total_hits*/
        ctx[11]
      );
      t26 = space();
      if (if_block1) if_block1.c();
      t27 = space();
      div2 = element("div");
      if (if_block2) if_block2.c();
      t28 = space();
      html_tag = new HtmlTag(false);
      t29 = space();
      div12 = element("div");
      create_component(toasts2.$$.fragment);
      t30 = space();
      div11 = element("div");
      div3 = element("div");
      div3.textContent = "Id";
      t32 = space();
      div4 = element("div");
      div4.textContent = "User";
      t34 = space();
      div5 = element("div");
      div5.textContent = "Account";
      t36 = space();
      div6 = element("div");
      div6.textContent = "Status";
      t38 = space();
      div7 = element("div");
      div7.textContent = "Duração";
      t40 = space();
      div8 = element("div");
      div8.textContent = "Data da Simulação";
      t42 = space();
      div9 = element("div");
      div9.textContent = "Nome (clique em um para acessar o log)";
      t44 = space();
      div10 = element("div");
      div10.textContent = "Abrir pasta...";
      t46 = space();
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(label0, "for", "user");
      attr(label0, "class", "text svelte-12qzibs");
      attr(input0, "class", "v_i svelte-12qzibs");
      attr(input0, "type", "text");
      attr(input0, "max", "4");
      attr(input0, "name", "user");
      set_style(input0, "width", "50px");
      attr(label1, "for", "user");
      attr(label1, "class", "text svelte-12qzibs");
      attr(input1, "class", "v_i svelte-12qzibs");
      attr(input1, "type", "text");
      attr(input1, "max", "16");
      attr(input1, "name", "user");
      set_style(input1, "width", "150px");
      attr(input2, "size", "12");
      attr(input2, "placeholder", "days");
      attr(input2, "class", "svelte-12qzibs");
      attr(label2, "class", "text svelte-12qzibs");
      attr(span0, "class", "hint");
      attr(span0, "title", "Filtrar quantos dias desejados de histórico");
      option0.__value = "";
      set_input_value(option0, option0.__value);
      option1.__value = "COMPLETED";
      set_input_value(option1, option1.__value);
      option2.__value = "CANCELLED";
      set_input_value(option2, option2.__value);
      option3.__value = "FAILED";
      set_input_value(option3, option3.__value);
      option4.__value = "NODE_FAIL";
      set_input_value(option4, option4.__value);
      attr(select, "class", "v_i");
      if (
        /*stateFilter*/
        ctx[2] === void 0
      ) add_render_callback(() => (
        /*select_change_handler*/
        ctx[27].call(select)
      ));
      attr(span1, "class", "hint");
      attr(span1, "title", "Filtrar pelo tipo de resultado dos jobs");
      attr(button0, "class", "svelte-12qzibs");
      attr(button1, "class", "svelte-12qzibs");
      attr(span2, "class", "badge svelte-12qzibs");
      attr(div0, "id", "top");
      attr(div0, "class", "pageTop svelte-12qzibs");
      attr(div1, "class", "first-line svelte-12qzibs");
      html_tag.a = null;
      attr(div2, "class", "second-line svelte-12qzibs");
      attr(div3, "class", "grid1-header svelte-12qzibs");
      attr(div4, "class", "grid1-header svelte-12qzibs");
      attr(div5, "class", "grid1-header svelte-12qzibs");
      attr(div6, "class", "grid1-header svelte-12qzibs");
      attr(div7, "class", "grid1-header svelte-12qzibs");
      attr(div8, "class", "grid1-header svelte-12qzibs");
      attr(div9, "class", "grid1-header svelte-12qzibs");
      attr(div10, "class", "grid1-header svelte-12qzibs");
      attr(div11, "class", "grid2 svelte-12qzibs");
      attr(div12, "class", "third-line svelte-12qzibs");
      attr(div13, "class", "wrapper svelte-12qzibs");
      attr(main, "class", "svelte-12qzibs");
    },
    m(target, anchor) {
      insert(target, main, anchor);
      mount_component(modal, main, null);
      append(main, t0);
      append(main, div13);
      mount_component(sidebardetails, div13, null);
      append(div13, t1);
      append(div13, div1);
      append(div1, div0);
      append(div0, label0);
      append(div0, t3);
      append(div0, input0);
      set_input_value(
        input0,
        /*selectedUser*/
        ctx[0]
      );
      append(div0, t4);
      mount_component(sep0, div0, null);
      append(div0, t5);
      append(div0, label1);
      append(div0, t7);
      append(div0, input1);
      set_input_value(
        input1,
        /*selectedAccount*/
        ctx[1]
      );
      append(div0, t8);
      mount_component(sep1, div0, null);
      append(div0, t9);
      append(div0, span0);
      append(span0, label2);
      append(label2, t10);
      append(label2, input2);
      set_input_value(
        input2,
        /*days*/
        ctx[3]
      );
      append(div0, t11);
      append(div0, span1);
      append(span1, select);
      append(select, option0);
      append(select, option1);
      append(select, option2);
      append(select, option3);
      append(select, option4);
      select_option(
        select,
        /*stateFilter*/
        ctx[2],
        true
      );
      append(div0, t17);
      mount_component(sep2, div0, null);
      append(div0, t18);
      append(div0, button0);
      append(div0, t20);
      if (if_block0) if_block0.m(div0, null);
      append(div0, t21);
      append(div0, button1);
      append(div0, t23);
      mount_component(sep3, div0, null);
      append(div0, t24);
      append(div0, span2);
      append(span2, t25);
      append(div0, t26);
      if (if_block1) if_block1.m(div0, null);
      append(div13, t27);
      append(div13, div2);
      if (if_block2) if_block2.m(div2, null);
      append(div2, t28);
      html_tag.m(raw_value, div2);
      append(div13, t29);
      append(div13, div12);
      mount_component(toasts2, div12, null);
      append(div12, t30);
      append(div12, div11);
      append(div11, div3);
      append(div11, t32);
      append(div11, div4);
      append(div11, t34);
      append(div11, div5);
      append(div11, t36);
      append(div11, div6);
      append(div11, t38);
      append(div11, div7);
      append(div11, t40);
      append(div11, div8);
      append(div11, t42);
      append(div11, div9);
      append(div11, t44);
      append(div11, div10);
      append(div11, t46);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div11, null);
        }
      }
      current = true;
      if (!mounted) {
        dispose = [
          listen(
            input0,
            "input",
            /*input0_input_handler*/
            ctx[24]
          ),
          listen(
            input1,
            "input",
            /*input1_input_handler*/
            ctx[25]
          ),
          listen(
            input2,
            "input",
            /*input2_input_handler*/
            ctx[26]
          ),
          listen(
            select,
            "change",
            /*select_change_handler*/
            ctx[27]
          ),
          listen(
            button0,
            "click",
            /*click_handler*/
            ctx[28]
          ),
          listen(
            button1,
            "click",
            /*click_handler_2*/
            ctx[30]
          )
        ];
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      const modal_changes = {};
      if (!updating_show && dirty[0] & /*modal_show*/
      16) {
        updating_show = true;
        modal_changes.show = /*modal_show*/
        ctx2[4];
        add_flush_callback(() => updating_show = false);
      }
      modal.$set(modal_changes);
      const sidebardetails_changes = {};
      if (dirty[0] & /*selection*/
      1024) sidebardetails_changes.selection = /*selection*/
      ctx2[10];
      if (dirty[1] & /*$$scope*/
      262144) {
        sidebardetails_changes.$$scope = { dirty, ctx: ctx2 };
      }
      if (!updating_show_1 && dirty[0] & /*sidebar_show*/
      32) {
        updating_show_1 = true;
        sidebardetails_changes.show = /*sidebar_show*/
        ctx2[5];
        add_flush_callback(() => updating_show_1 = false);
      }
      sidebardetails.$set(sidebardetails_changes);
      if (dirty[0] & /*selectedUser*/
      1 && input0.value !== /*selectedUser*/
      ctx2[0]) {
        set_input_value(
          input0,
          /*selectedUser*/
          ctx2[0]
        );
      }
      if (dirty[0] & /*selectedAccount*/
      2 && input1.value !== /*selectedAccount*/
      ctx2[1]) {
        set_input_value(
          input1,
          /*selectedAccount*/
          ctx2[1]
        );
      }
      if (dirty[0] & /*days*/
      8 && input2.value !== /*days*/
      ctx2[3]) {
        set_input_value(
          input2,
          /*days*/
          ctx2[3]
        );
      }
      if (dirty[0] & /*stateFilter*/
      4) {
        select_option(
          select,
          /*stateFilter*/
          ctx2[2]
        );
      }
      if (
        /*rows*/
        ctx2[7] && /*rows*/
        ctx2[7].length > 0
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_3(ctx2);
          if_block0.c();
          if_block0.m(div0, t21);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (!current || dirty[0] & /*total_hits*/
      2048) set_data(
        t25,
        /*total_hits*/
        ctx2[11]
      );
      if (
        /*total_hits*/
        ctx2[11] > 0
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block_2(ctx2);
          if_block1.c();
          if_block1.m(div0, null);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (
        /*loading*/
        ctx2[13]
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
          if (dirty[0] & /*loading*/
          8192) {
            transition_in(if_block2, 1);
          }
        } else {
          if_block2 = create_if_block_1$1(ctx2);
          if_block2.c();
          transition_in(if_block2, 1);
          if_block2.m(div2, t28);
        }
      } else if (if_block2) {
        group_outros();
        transition_out(if_block2, 1, 1, () => {
          if_block2 = null;
        });
        check_outros();
      }
      if ((!current || dirty[0] & /*statusMessage*/
      64) && raw_value !== (raw_value = /*statusMessage*/
      ctx2[6].split(":")[0] + "")) html_tag.p(raw_value);
      if (dirty[0] & /*openVScodeFolder, rows, openSystemFolder, openLog, linkAvailable, openPortal, moreInfo*/
      1949824) {
        each_value = ensure_array_like(
          /*rows*/
          ctx2[7]
        );
        group_outros();
        each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx2, each_value, each_1_lookup, div11, outro_and_destroy_block, create_each_block, null, get_each_context);
        check_outros();
      }
    },
    i(local) {
      if (current) return;
      transition_in(modal.$$.fragment, local);
      transition_in(sidebardetails.$$.fragment, local);
      transition_in(sep0.$$.fragment, local);
      transition_in(sep1.$$.fragment, local);
      transition_in(sep2.$$.fragment, local);
      transition_in(sep3.$$.fragment, local);
      transition_in(if_block2);
      transition_in(toasts2.$$.fragment, local);
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o(local) {
      transition_out(modal.$$.fragment, local);
      transition_out(sidebardetails.$$.fragment, local);
      transition_out(sep0.$$.fragment, local);
      transition_out(sep1.$$.fragment, local);
      transition_out(sep2.$$.fragment, local);
      transition_out(sep3.$$.fragment, local);
      transition_out(if_block2);
      transition_out(toasts2.$$.fragment, local);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(main);
      }
      destroy_component(modal);
      destroy_component(sidebardetails);
      destroy_component(sep0);
      destroy_component(sep1);
      destroy_component(sep2);
      if (if_block0) if_block0.d();
      destroy_component(sep3);
      if (if_block1) if_block1.d();
      if (if_block2) if_block2.d();
      destroy_component(toasts2);
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].d();
      }
      mounted = false;
      run_all(dispose);
    }
  };
}
let modal_question = "Confirma matar os jobs selecionados?";
function removeDuplicates(data) {
  const uniqueJobs = [];
  const jobIds = /* @__PURE__ */ new Set();
  data.forEach((item) => {
    if (!jobIds.has(item._source.jobid)) {
      jobIds.add(item._source.jobid);
      uniqueJobs.push(item);
    }
  });
  return uniqueJobs;
}
const remove_handler = () => {
};
function instance$2($$self, $$props, $$invalidate) {
  let modal_show = false;
  let sidebar_show = false;
  let statusMessage = ":";
  let selectedUser = getMeta("user");
  let selectedAccount = "";
  let results = null;
  let rows = [];
  let page = 0;
  let totalPages = 0;
  let { itemsPerPage = 25 } = $$props;
  let selection = {};
  let stateFilter;
  let days = 10;
  let kibana = null;
  let total_hits = 0;
  let localTickTack = "";
  ticktac.subscribe((value) => $$invalidate(12, localTickTack = value));
  let loading = false;
  let proxyPort = getMeta("proxyPort");
  if (!proxyPort) {
    proxyPort = "5173";
  }
  const get_kibana = async (user, accounting, days2, itemsPerPage2, stateFilter2) => {
    kibana = new KibanaDataSource(user || "", accounting, days2, stateFilter2, proxyPort);
    $$invalidate(13, loading = true);
    const resp = await kibana.getData(itemsPerPage2, page * itemsPerPage2);
    $$invalidate(13, loading = false);
    if (!resp || resp.hits.hits.length === 0) {
      return null;
    }
    console.log(`Total de entradas: ${kibana._hitsTotal}, total de páginas: ${Math.ceil(kibana._hitsTotal / itemsPerPage2)}`);
    $$invalidate(9, totalPages = Math.ceil(kibana._hitsTotal / itemsPerPage2));
    $$invalidate(11, total_hits = kibana._hitsTotal);
    return resp;
  };
  let timeout = null;
  function showMessage(message, delay = 3e3) {
    $$invalidate(6, statusMessage = message + ":" + Math.random().toString(36).slice(-5));
    if (timeout) clearTimeout(timeout);
    if (delay) {
      timeout = setTimeout(
        () => {
          $$invalidate(6, statusMessage = ":");
        },
        delay
      );
    }
  }
  onMount(() => {
    const rcvEvents = (param) => {
      let data = "data" in param ? param["data"] : param["detail"];
      if ("message" in data) {
        switch (data.message) {
          case "info":
            if ("extra" in data && data.extra === "noHist") {
              results = null;
              $$invalidate(7, rows = []);
            }
            break;
          case "openLogRet":
            if (data.retcode !== 200) showMessage(data.extra, 4e3);
            break;
        }
      }
    };
    window.addEventListener("message", rcvEvents);
    return () => {
      console.log("Escuta de evento destruída no history");
      window.removeEventListener("message", rcvEvents);
    };
  });
  onDestroy(() => {
    console.log("History destroyed");
  });
  function moreInfo(jobid) {
    let elem = rows.findIndex((e) => e._source.jobid === jobid);
    $$invalidate(10, selection = {});
    histInfoOrder.forEach((key) => {
      if (key) {
        const formattedVal = formatValue(key, rows[elem]._source[key]);
        $$invalidate(10, selection[converHistKeyName(key)] = formattedVal, selection);
      }
    });
    $$invalidate(5, sidebar_show = true);
  }
  const linkAvailable = (elem) => {
    return elem.job_name.match(/\.(data|dat|xml|DATA|geo|gdt)$|((data|dat)\.[a-f0-9]{8})$/i) || elem.work_dir.match(/.*\.cmpd.*/i);
  };
  const openLog = (jobid) => {
    let elem = rows.findIndex((e) => e._source.jobid === jobid);
    vscode.postMessage({
      command: "openLog",
      info: "Carregar o Log de um elemento",
      payload: {
        jobid,
        chdir: rows[elem]._source.work_dir,
        name: rows[elem]._source.job_name
      }
    });
  };
  const setPage = async (p, inc = true) => {
    if (p >= 0 && p < totalPages) {
      $$invalidate(8, page = inc ? p : page);
      if (kibana) {
        console.log("Pedindo página " + p);
        $$invalidate(13, loading = true);
        results = await kibana.getData(itemsPerPage, p * itemsPerPage);
        $$invalidate(13, loading = false);
        if (results) $$invalidate(7, rows = removeDuplicates(results.hits.hits));
      }
    }
  };
  function openPortal(user) {
    vscode.postMessage({ command: "openUrlLink", args: user });
  }
  function openSystemFolder(folder) {
    if (folder) {
      vscode.postMessage({
        command: "openSystemFolder",
        info: "Abrir pasta no windows",
        payload: { chdir: folder }
      });
    }
  }
  function openVScodeFolder(folder) {
    if (folder) {
      vscode.postMessage({
        command: "openVScodeFolder",
        info: "Abrir pasta no windows",
        payload: { chdir: folder }
      });
    }
  }
  function modal_show_binding(value) {
    modal_show = value;
    $$invalidate(4, modal_show);
  }
  function sidebardetails_show_binding(value) {
    sidebar_show = value;
    $$invalidate(5, sidebar_show);
  }
  function input0_input_handler() {
    selectedUser = this.value;
    $$invalidate(0, selectedUser);
  }
  function input1_input_handler() {
    selectedAccount = this.value;
    $$invalidate(1, selectedAccount);
  }
  function input2_input_handler() {
    days = this.value;
    $$invalidate(3, days);
  }
  function select_change_handler() {
    stateFilter = select_value(this);
    $$invalidate(2, stateFilter);
  }
  const click_handler = () => setPage(page - 5 > 0 ? page - 5 : 0, true);
  const click_handler_1 = (i) => setPage(page + i, false);
  const click_handler_2 = () => setPage(page + 5 > totalPages ? totalPages - 1 : page + 5, true);
  const click_handler_3 = (job) => {
    moreInfo(job._source.jobid);
  };
  const click_handler_4 = (job) => {
    openPortal(job._source.username);
  };
  const click_handler_5 = (job) => openLog(job._source.jobid);
  const click_handler_6 = (job) => openSystemFolder(job._source.work_dir);
  const click_handler_7 = (job) => openVScodeFolder(job._source.work_dir);
  $$self.$$set = ($$props2) => {
    if ("itemsPerPage" in $$props2) $$invalidate(21, itemsPerPage = $$props2.itemsPerPage);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty[0] & /*selectedUser, selectedAccount, days, itemsPerPage, stateFilter*/
    2097167) {
      get_kibana(selectedUser, selectedAccount, days, itemsPerPage, stateFilter).then((result) => {
        if (result) {
          $$invalidate(7, rows = removeDuplicates(result.hits.hits));
          $$invalidate(8, page = 0);
        }
      });
    }
  };
  return [
    selectedUser,
    selectedAccount,
    stateFilter,
    days,
    modal_show,
    sidebar_show,
    statusMessage,
    rows,
    page,
    totalPages,
    selection,
    total_hits,
    localTickTack,
    loading,
    moreInfo,
    linkAvailable,
    openLog,
    setPage,
    openPortal,
    openSystemFolder,
    openVScodeFolder,
    itemsPerPage,
    modal_show_binding,
    sidebardetails_show_binding,
    input0_input_handler,
    input1_input_handler,
    input2_input_handler,
    select_change_handler,
    click_handler,
    click_handler_1,
    click_handler_2,
    click_handler_3,
    click_handler_4,
    click_handler_5,
    click_handler_6,
    click_handler_7
  ];
}
class History extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$2, create_fragment$2, safe_not_equal, { itemsPerPage: 21 }, null, [-1, -1]);
  }
}
function create_else_block$1(ctx) {
  let p;
  return {
    c() {
      p = element("p");
      p.textContent = "Indefinido";
    },
    m(target, anchor) {
      insert(target, p, anchor);
    },
    p: noop$1,
    i: noop$1,
    o: noop$1,
    d(detaching) {
      if (detaching) {
        detach(p);
      }
    }
  };
}
function create_if_block_1(ctx) {
  let jobs2;
  let current;
  jobs2 = new Jobs2({
    props: { itemsPerPage: (
      /*itemsPerPage*/
      ctx[1]
    ) }
  });
  return {
    c() {
      create_component(jobs2.$$.fragment);
    },
    m(target, anchor) {
      mount_component(jobs2, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const jobs2_changes = {};
      if (dirty & /*itemsPerPage*/
      2) jobs2_changes.itemsPerPage = /*itemsPerPage*/
      ctx2[1];
      jobs2.$set(jobs2_changes);
    },
    i(local) {
      if (current) return;
      transition_in(jobs2.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(jobs2.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(jobs2, detaching);
    }
  };
}
function create_if_block$1(ctx) {
  let history;
  let current;
  history = new History({
    props: { itemsPerPage: (
      /*itemsPerPage*/
      ctx[1]
    ) }
  });
  return {
    c() {
      create_component(history.$$.fragment);
    },
    m(target, anchor) {
      mount_component(history, target, anchor);
      current = true;
    },
    p(ctx2, dirty) {
      const history_changes = {};
      if (dirty & /*itemsPerPage*/
      2) history_changes.itemsPerPage = /*itemsPerPage*/
      ctx2[1];
      history.$set(history_changes);
    },
    i(local) {
      if (current) return;
      transition_in(history.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(history.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(history, detaching);
    }
  };
}
function create_fragment$1(ctx) {
  let main;
  let div1;
  let div0;
  let label0;
  let t1;
  let sep0;
  let t2;
  let label1;
  let input0;
  let t3;
  let t4;
  let label2;
  let input1;
  let t5;
  let t6;
  let sep1;
  let t7;
  let label3;
  let t8;
  let input2;
  let t9;
  let current_block_type_index;
  let if_block;
  let current;
  let binding_group;
  let mounted;
  let dispose;
  sep0 = new Separator({ props: { w: 3 } });
  sep1 = new Separator({ props: { w: 5 } });
  const if_block_creators = [create_if_block$1, create_if_block_1, create_else_block$1];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*relat*/
      ctx2[0] === "history"
    ) return 0;
    if (
      /*relat*/
      ctx2[0] === "jobs"
    ) return 1;
    return 2;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  binding_group = init_binding_group(
    /*$$binding_groups*/
    ctx[3][0]
  );
  return {
    c() {
      main = element("main");
      div1 = element("div");
      div0 = element("div");
      label0 = element("label");
      label0.textContent = "Gerenciamento de Jobs:";
      t1 = space();
      create_component(sep0.$$.fragment);
      t2 = space();
      label1 = element("label");
      input0 = element("input");
      t3 = text("\r\n                Jobs em curso");
      t4 = space();
      label2 = element("label");
      input1 = element("input");
      t5 = text("\r\n                Histórico");
      t6 = space();
      create_component(sep1.$$.fragment);
      t7 = space();
      label3 = element("label");
      t8 = text("Items por página:\r\n                ");
      input2 = element("input");
      t9 = space();
      if_block.c();
      attr(label0, "for", "pagetop");
      attr(label0, "class", "title");
      attr(input0, "type", "radio");
      attr(input0, "name", "relat1");
      input0.__value = "jobs";
      set_input_value(input0, input0.__value);
      attr(label1, "class", "text");
      attr(input1, "type", "radio");
      attr(input1, "name", "relat1");
      input1.__value = "history";
      set_input_value(input1, input1.__value);
      attr(label2, "class", "text");
      attr(input2, "class", "v_i");
      attr(input2, "type", "number");
      attr(input2, "min", "10");
      attr(input2, "max", "100");
      attr(input2, "name", "user");
      set_style(input2, "width", "50px");
      attr(label3, "class", "text");
      attr(div0, "class", "first-line");
      attr(div1, "class", "wrapper");
      binding_group.p(input0, input1);
    },
    m(target, anchor) {
      insert(target, main, anchor);
      append(main, div1);
      append(div1, div0);
      append(div0, label0);
      append(div0, t1);
      mount_component(sep0, div0, null);
      append(div0, t2);
      append(div0, label1);
      append(label1, input0);
      input0.checked = input0.__value === /*relat*/
      ctx[0];
      append(label1, t3);
      append(div0, t4);
      append(div0, label2);
      append(label2, input1);
      input1.checked = input1.__value === /*relat*/
      ctx[0];
      append(label2, t5);
      append(div0, t6);
      mount_component(sep1, div0, null);
      append(div0, t7);
      append(div0, label3);
      append(label3, t8);
      append(label3, input2);
      set_input_value(
        input2,
        /*itemsPerPage*/
        ctx[1]
      );
      append(div0, t9);
      if_blocks[current_block_type_index].m(div0, null);
      current = true;
      if (!mounted) {
        dispose = [
          listen(
            input0,
            "change",
            /*input0_change_handler*/
            ctx[2]
          ),
          listen(
            input1,
            "change",
            /*input1_change_handler*/
            ctx[4]
          ),
          listen(
            input2,
            "input",
            /*input2_input_handler*/
            ctx[5]
          )
        ];
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*relat*/
      1) {
        input0.checked = input0.__value === /*relat*/
        ctx2[0];
      }
      if (dirty & /*relat*/
      1) {
        input1.checked = input1.__value === /*relat*/
        ctx2[0];
      }
      if (dirty & /*itemsPerPage*/
      2 && to_number(input2.value) !== /*itemsPerPage*/
      ctx2[1]) {
        set_input_value(
          input2,
          /*itemsPerPage*/
          ctx2[1]
        );
      }
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(div0, null);
      }
    },
    i(local) {
      if (current) return;
      transition_in(sep0.$$.fragment, local);
      transition_in(sep1.$$.fragment, local);
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(sep0.$$.fragment, local);
      transition_out(sep1.$$.fragment, local);
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(main);
      }
      destroy_component(sep0);
      destroy_component(sep1);
      if_blocks[current_block_type_index].d();
      binding_group.r();
      mounted = false;
      run_all(dispose);
    }
  };
}
function instance$1($$self, $$props, $$invalidate) {
  let relat = "jobs";
  let itemsPerPage = 25;
  const $$binding_groups = [[]];
  function input0_change_handler() {
    relat = this.__value;
    $$invalidate(0, relat);
  }
  function input1_change_handler() {
    relat = this.__value;
    $$invalidate(0, relat);
  }
  function input2_input_handler() {
    itemsPerPage = to_number(this.value);
    $$invalidate(1, itemsPerPage);
  }
  return [
    relat,
    itemsPerPage,
    input0_change_handler,
    $$binding_groups,
    input1_change_handler,
    input2_input_handler
  ];
}
class MgmtView extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
  }
}
function create_else_block(ctx) {
  let p;
  return {
    c() {
      p = element("p");
      p.textContent = "Nenhuma rota identificada no meta do html";
    },
    m(target, anchor) {
      insert(target, p, anchor);
    },
    i: noop$1,
    o: noop$1,
    d(detaching) {
      if (detaching) {
        detach(p);
      }
    }
  };
}
function create_if_block(ctx) {
  let mgmtview;
  let current;
  mgmtview = new MgmtView({});
  return {
    c() {
      create_component(mgmtview.$$.fragment);
    },
    m(target, anchor) {
      mount_component(mgmtview, target, anchor);
      current = true;
    },
    i(local) {
      if (current) return;
      transition_in(mgmtview.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(mgmtview.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(mgmtview, detaching);
    }
  };
}
function create_fragment(ctx) {
  let main;
  let current_block_type_index;
  let if_block;
  let current;
  const if_block_creators = [create_if_block, create_else_block];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*route*/
      ctx2[0] === "vshpc.jobsviewer"
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  return {
    c() {
      main = element("main");
      if_block.c();
    },
    m(target, anchor) {
      insert(target, main, anchor);
      if_blocks[current_block_type_index].m(main, null);
      current = true;
    },
    p(ctx2, [dirty]) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2);
      if (current_block_type_index !== previous_block_index) {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        }
        transition_in(if_block, 1);
        if_block.m(main, null);
      }
    },
    i(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o(local) {
      transition_out(if_block);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(main);
      }
      if_blocks[current_block_type_index].d();
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let route = getMeta$1("route");
  route = "vshpc.jobsviewer";
  return [route];
}
class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {});
  }
}
new App({
  target: document.getElementById("app")
});
