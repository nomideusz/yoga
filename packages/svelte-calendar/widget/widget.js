(function() {
  "use strict";
  const DERIVED = 1 << 1;
  const EFFECT = 1 << 2;
  const RENDER_EFFECT = 1 << 3;
  const MANAGED_EFFECT = 1 << 24;
  const BLOCK_EFFECT = 1 << 4;
  const BRANCH_EFFECT = 1 << 5;
  const ROOT_EFFECT = 1 << 6;
  const BOUNDARY_EFFECT = 1 << 7;
  const CONNECTED = 1 << 9;
  const CLEAN = 1 << 10;
  const DIRTY = 1 << 11;
  const MAYBE_DIRTY = 1 << 12;
  const INERT = 1 << 13;
  const DESTROYED = 1 << 14;
  const REACTION_RAN = 1 << 15;
  const EFFECT_TRANSPARENT = 1 << 16;
  const EAGER_EFFECT = 1 << 17;
  const HEAD_EFFECT = 1 << 18;
  const EFFECT_PRESERVED = 1 << 19;
  const USER_EFFECT = 1 << 20;
  const EFFECT_OFFSCREEN = 1 << 25;
  const WAS_MARKED = 1 << 16;
  const REACTION_IS_UPDATING = 1 << 21;
  const ASYNC = 1 << 22;
  const ERROR_VALUE = 1 << 23;
  const STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
  const LEGACY_PROPS = /* @__PURE__ */ Symbol("legacy props");
  const LOADING_ATTR_SYMBOL = /* @__PURE__ */ Symbol("");
  const STALE_REACTION = new class StaleReactionError extends Error {
    name = "StaleReactionError";
    message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
  }();
  const IS_XHTML = (
    // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
    !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml")
  );
  const TEXT_NODE = 3;
  const COMMENT_NODE = 8;
  const DEV = false;
  var is_array = Array.isArray;
  var index_of = Array.prototype.indexOf;
  var includes = Array.prototype.includes;
  var array_from = Array.from;
  var define_property = Object.defineProperty;
  var get_descriptor = Object.getOwnPropertyDescriptor;
  var get_descriptors = Object.getOwnPropertyDescriptors;
  var object_prototype = Object.prototype;
  var array_prototype = Array.prototype;
  var get_prototype_of = Object.getPrototypeOf;
  var is_extensible = Object.isExtensible;
  function is_function(thing) {
    return typeof thing === "function";
  }
  const noop = () => {
  };
  function run_all(arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i]();
    }
  }
  function deferred() {
    var resolve;
    var reject;
    var promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
  function equals(value) {
    return value === this.v;
  }
  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
  }
  function safe_equals(value) {
    return !safe_not_equal(value, this.v);
  }
  function lifecycle_outside_component(name) {
    {
      throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
    }
  }
  function async_derived_orphan() {
    {
      throw new Error(`https://svelte.dev/e/async_derived_orphan`);
    }
  }
  function each_key_duplicate(a, b, value) {
    {
      throw new Error(`https://svelte.dev/e/each_key_duplicate`);
    }
  }
  function effect_in_teardown(rune) {
    {
      throw new Error(`https://svelte.dev/e/effect_in_teardown`);
    }
  }
  function effect_in_unowned_derived() {
    {
      throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
    }
  }
  function effect_orphan(rune) {
    {
      throw new Error(`https://svelte.dev/e/effect_orphan`);
    }
  }
  function effect_update_depth_exceeded() {
    {
      throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
    }
  }
  function hydration_failed() {
    {
      throw new Error(`https://svelte.dev/e/hydration_failed`);
    }
  }
  function props_invalid_value(key) {
    {
      throw new Error(`https://svelte.dev/e/props_invalid_value`);
    }
  }
  function state_descriptors_fixed() {
    {
      throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
    }
  }
  function state_prototype_fixed() {
    {
      throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
    }
  }
  function state_unsafe_mutation() {
    {
      throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
    }
  }
  function svelte_boundary_reset_onerror() {
    {
      throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
    }
  }
  let tracing_mode_flag = false;
  const EACH_ITEM_REACTIVE = 1;
  const EACH_INDEX_REACTIVE = 1 << 1;
  const EACH_IS_CONTROLLED = 1 << 2;
  const EACH_IS_ANIMATED = 1 << 3;
  const EACH_ITEM_IMMUTABLE = 1 << 4;
  const PROPS_IS_IMMUTABLE = 1;
  const PROPS_IS_UPDATED = 1 << 2;
  const PROPS_IS_BINDABLE = 1 << 3;
  const PROPS_IS_LAZY_INITIAL = 1 << 4;
  const TEMPLATE_FRAGMENT = 1;
  const TEMPLATE_USE_IMPORT_NODE = 1 << 1;
  const HYDRATION_START = "[";
  const HYDRATION_START_ELSE = "[!";
  const HYDRATION_START_FAILED = "[?";
  const HYDRATION_END = "]";
  const HYDRATION_ERROR = {};
  const UNINITIALIZED = /* @__PURE__ */ Symbol();
  const NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
  let component_context = null;
  function set_component_context(context) {
    component_context = context;
  }
  function getContext(key) {
    const context_map = get_or_init_context_map();
    const result = (
      /** @type {T} */
      context_map.get(key)
    );
    return result;
  }
  function setContext(key, context) {
    const context_map = get_or_init_context_map();
    context_map.set(key, context);
    return context;
  }
  function push(props, runes = false, fn) {
    component_context = {
      p: component_context,
      i: false,
      c: null,
      e: null,
      s: props,
      x: null,
      l: null
    };
  }
  function pop(component2) {
    var context = (
      /** @type {ComponentContext} */
      component_context
    );
    var effects = context.e;
    if (effects !== null) {
      context.e = null;
      for (var fn of effects) {
        create_user_effect(fn);
      }
    }
    context.i = true;
    component_context = context.p;
    return (
      /** @type {T} */
      {}
    );
  }
  function is_runes() {
    return true;
  }
  function get_or_init_context_map(name) {
    if (component_context === null) {
      lifecycle_outside_component();
    }
    return component_context.c ??= new Map(get_parent_context(component_context) || void 0);
  }
  function get_parent_context(component_context2) {
    let parent = component_context2.p;
    while (parent !== null) {
      const context_map = parent.c;
      if (context_map !== null) {
        return context_map;
      }
      parent = parent.p;
    }
    return null;
  }
  let micro_tasks = [];
  function run_micro_tasks() {
    var tasks = micro_tasks;
    micro_tasks = [];
    run_all(tasks);
  }
  function queue_micro_task(fn) {
    if (micro_tasks.length === 0 && !is_flushing_sync) {
      var tasks = micro_tasks;
      queueMicrotask(() => {
        if (tasks === micro_tasks) run_micro_tasks();
      });
    }
    micro_tasks.push(fn);
  }
  function flush_tasks() {
    while (micro_tasks.length > 0) {
      run_micro_tasks();
    }
  }
  function hydration_mismatch(location) {
    {
      console.warn(`https://svelte.dev/e/hydration_mismatch`);
    }
  }
  function svelte_boundary_reset_noop() {
    {
      console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
    }
  }
  let hydrating = false;
  function set_hydrating(value) {
    hydrating = value;
  }
  let hydrate_node;
  function set_hydrate_node(node) {
    if (node === null) {
      hydration_mismatch();
      throw HYDRATION_ERROR;
    }
    return hydrate_node = node;
  }
  function hydrate_next() {
    return set_hydrate_node(/* @__PURE__ */ get_next_sibling(hydrate_node));
  }
  function reset(node) {
    if (!hydrating) return;
    if (/* @__PURE__ */ get_next_sibling(hydrate_node) !== null) {
      hydration_mismatch();
      throw HYDRATION_ERROR;
    }
    hydrate_node = node;
  }
  function next(count = 1) {
    if (hydrating) {
      var i = count;
      var node = hydrate_node;
      while (i--) {
        node = /** @type {TemplateNode} */
        /* @__PURE__ */ get_next_sibling(node);
      }
      hydrate_node = node;
    }
  }
  function skip_nodes(remove = true) {
    var depth = 0;
    var node = hydrate_node;
    while (true) {
      if (node.nodeType === COMMENT_NODE) {
        var data = (
          /** @type {Comment} */
          node.data
        );
        if (data === HYDRATION_END) {
          if (depth === 0) return node;
          depth -= 1;
        } else if (data === HYDRATION_START || data === HYDRATION_START_ELSE || // "[1", "[2", etc. for if blocks
        data[0] === "[" && !isNaN(Number(data.slice(1)))) {
          depth += 1;
        }
      }
      var next2 = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ get_next_sibling(node)
      );
      if (remove) node.remove();
      node = next2;
    }
  }
  function read_hydration_instruction(node) {
    if (!node || node.nodeType !== COMMENT_NODE) {
      hydration_mismatch();
      throw HYDRATION_ERROR;
    }
    return (
      /** @type {Comment} */
      node.data
    );
  }
  function proxy(value) {
    if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
      return value;
    }
    const prototype = get_prototype_of(value);
    if (prototype !== object_prototype && prototype !== array_prototype) {
      return value;
    }
    var sources = /* @__PURE__ */ new Map();
    var is_proxied_array = is_array(value);
    var version = /* @__PURE__ */ state(0);
    var parent_version = update_version;
    var with_parent = (fn) => {
      if (update_version === parent_version) {
        return fn();
      }
      var reaction = active_reaction;
      var version2 = update_version;
      set_active_reaction(null);
      set_update_version(parent_version);
      var result = fn();
      set_active_reaction(reaction);
      set_update_version(version2);
      return result;
    };
    if (is_proxied_array) {
      sources.set("length", /* @__PURE__ */ state(
        /** @type {any[]} */
        value.length
      ));
    }
    return new Proxy(
      /** @type {any} */
      value,
      {
        defineProperty(_, prop2, descriptor) {
          if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
            state_descriptors_fixed();
          }
          var s = sources.get(prop2);
          if (s === void 0) {
            with_parent(() => {
              var s2 = /* @__PURE__ */ state(descriptor.value);
              sources.set(prop2, s2);
              return s2;
            });
          } else {
            set(s, descriptor.value, true);
          }
          return true;
        },
        deleteProperty(target, prop2) {
          var s = sources.get(prop2);
          if (s === void 0) {
            if (prop2 in target) {
              const s2 = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
              sources.set(prop2, s2);
              increment(version);
            }
          } else {
            set(s, UNINITIALIZED);
            increment(version);
          }
          return true;
        },
        get(target, prop2, receiver) {
          if (prop2 === STATE_SYMBOL) {
            return value;
          }
          var s = sources.get(prop2);
          var exists = prop2 in target;
          if (s === void 0 && (!exists || get_descriptor(target, prop2)?.writable)) {
            s = with_parent(() => {
              var p = proxy(exists ? target[prop2] : UNINITIALIZED);
              var s2 = /* @__PURE__ */ state(p);
              return s2;
            });
            sources.set(prop2, s);
          }
          if (s !== void 0) {
            var v = get(s);
            return v === UNINITIALIZED ? void 0 : v;
          }
          return Reflect.get(target, prop2, receiver);
        },
        getOwnPropertyDescriptor(target, prop2) {
          var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
          if (descriptor && "value" in descriptor) {
            var s = sources.get(prop2);
            if (s) descriptor.value = get(s);
          } else if (descriptor === void 0) {
            var source2 = sources.get(prop2);
            var value2 = source2?.v;
            if (source2 !== void 0 && value2 !== UNINITIALIZED) {
              return {
                enumerable: true,
                configurable: true,
                value: value2,
                writable: true
              };
            }
          }
          return descriptor;
        },
        has(target, prop2) {
          if (prop2 === STATE_SYMBOL) {
            return true;
          }
          var s = sources.get(prop2);
          var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target, prop2);
          if (s !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop2)?.writable)) {
            if (s === void 0) {
              s = with_parent(() => {
                var p = has ? proxy(target[prop2]) : UNINITIALIZED;
                var s2 = /* @__PURE__ */ state(p);
                return s2;
              });
              sources.set(prop2, s);
            }
            var value2 = get(s);
            if (value2 === UNINITIALIZED) {
              return false;
            }
          }
          return has;
        },
        set(target, prop2, value2, receiver) {
          var s = sources.get(prop2);
          var has = prop2 in target;
          if (is_proxied_array && prop2 === "length") {
            for (var i = value2; i < /** @type {Source<number>} */
            s.v; i += 1) {
              var other_s = sources.get(i + "");
              if (other_s !== void 0) {
                set(other_s, UNINITIALIZED);
              } else if (i in target) {
                other_s = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
                sources.set(i + "", other_s);
              }
            }
          }
          if (s === void 0) {
            if (!has || get_descriptor(target, prop2)?.writable) {
              s = with_parent(() => /* @__PURE__ */ state(void 0));
              set(s, proxy(value2));
              sources.set(prop2, s);
            }
          } else {
            has = s.v !== UNINITIALIZED;
            var p = with_parent(() => proxy(value2));
            set(s, p);
          }
          var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
          if (descriptor?.set) {
            descriptor.set.call(receiver, value2);
          }
          if (!has) {
            if (is_proxied_array && typeof prop2 === "string") {
              var ls = (
                /** @type {Source<number>} */
                sources.get("length")
              );
              var n = Number(prop2);
              if (Number.isInteger(n) && n >= ls.v) {
                set(ls, n + 1);
              }
            }
            increment(version);
          }
          return true;
        },
        ownKeys(target) {
          get(version);
          var own_keys = Reflect.ownKeys(target).filter((key2) => {
            var source3 = sources.get(key2);
            return source3 === void 0 || source3.v !== UNINITIALIZED;
          });
          for (var [key, source2] of sources) {
            if (source2.v !== UNINITIALIZED && !(key in target)) {
              own_keys.push(key);
            }
          }
          return own_keys;
        },
        setPrototypeOf() {
          state_prototype_fixed();
        }
      }
    );
  }
  var $window;
  var is_firefox;
  var first_child_getter;
  var next_sibling_getter;
  function init_operations() {
    if ($window !== void 0) {
      return;
    }
    $window = window;
    is_firefox = /Firefox/.test(navigator.userAgent);
    var element_prototype = Element.prototype;
    var node_prototype = Node.prototype;
    var text_prototype = Text.prototype;
    first_child_getter = get_descriptor(node_prototype, "firstChild").get;
    next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
    if (is_extensible(element_prototype)) {
      element_prototype.__click = void 0;
      element_prototype.__className = void 0;
      element_prototype.__attributes = null;
      element_prototype.__style = void 0;
      element_prototype.__e = void 0;
    }
    if (is_extensible(text_prototype)) {
      text_prototype.__t = void 0;
    }
  }
  function create_text(value = "") {
    return document.createTextNode(value);
  }
  // @__NO_SIDE_EFFECTS__
  function get_first_child(node) {
    return (
      /** @type {TemplateNode | null} */
      first_child_getter.call(node)
    );
  }
  // @__NO_SIDE_EFFECTS__
  function get_next_sibling(node) {
    return (
      /** @type {TemplateNode | null} */
      next_sibling_getter.call(node)
    );
  }
  function child(node, is_text) {
    if (!hydrating) {
      return /* @__PURE__ */ get_first_child(node);
    }
    var child2 = /* @__PURE__ */ get_first_child(hydrate_node);
    if (child2 === null) {
      child2 = hydrate_node.appendChild(create_text());
    } else if (is_text && child2.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      child2?.before(text2);
      set_hydrate_node(text2);
      return text2;
    }
    if (is_text) {
      merge_text_nodes(
        /** @type {Text} */
        child2
      );
    }
    set_hydrate_node(child2);
    return child2;
  }
  function first_child(node, is_text = false) {
    if (!hydrating) {
      var first = /* @__PURE__ */ get_first_child(node);
      if (first instanceof Comment && first.data === "") return /* @__PURE__ */ get_next_sibling(first);
      return first;
    }
    if (is_text) {
      if (hydrate_node?.nodeType !== TEXT_NODE) {
        var text2 = create_text();
        hydrate_node?.before(text2);
        set_hydrate_node(text2);
        return text2;
      }
      merge_text_nodes(
        /** @type {Text} */
        hydrate_node
      );
    }
    return hydrate_node;
  }
  function sibling(node, count = 1, is_text = false) {
    let next_sibling = hydrating ? hydrate_node : node;
    var last_sibling;
    while (count--) {
      last_sibling = next_sibling;
      next_sibling = /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(next_sibling);
    }
    if (!hydrating) {
      return next_sibling;
    }
    if (is_text) {
      if (next_sibling?.nodeType !== TEXT_NODE) {
        var text2 = create_text();
        if (next_sibling === null) {
          last_sibling?.after(text2);
        } else {
          next_sibling.before(text2);
        }
        set_hydrate_node(text2);
        return text2;
      }
      merge_text_nodes(
        /** @type {Text} */
        next_sibling
      );
    }
    set_hydrate_node(next_sibling);
    return next_sibling;
  }
  function clear_text_content(node) {
    node.textContent = "";
  }
  function should_defer_append() {
    return false;
  }
  function create_element(tag, namespace, is) {
    let options = void 0;
    return (
      /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
      document.createElementNS(NAMESPACE_HTML, tag, options)
    );
  }
  function merge_text_nodes(text2) {
    if (
      /** @type {string} */
      text2.nodeValue.length < 65536
    ) {
      return;
    }
    let next2 = text2.nextSibling;
    while (next2 !== null && next2.nodeType === TEXT_NODE) {
      next2.remove();
      text2.nodeValue += /** @type {string} */
      next2.nodeValue;
      next2 = text2.nextSibling;
    }
  }
  function handle_error(error) {
    var effect2 = active_effect;
    if (effect2 === null) {
      active_reaction.f |= ERROR_VALUE;
      return error;
    }
    if ((effect2.f & REACTION_RAN) === 0 && (effect2.f & EFFECT) === 0) {
      throw error;
    }
    invoke_error_boundary(error, effect2);
  }
  function invoke_error_boundary(error, effect2) {
    while (effect2 !== null) {
      if ((effect2.f & BOUNDARY_EFFECT) !== 0) {
        if ((effect2.f & REACTION_RAN) === 0) {
          throw error;
        }
        try {
          effect2.b.error(error);
          return;
        } catch (e) {
          error = e;
        }
      }
      effect2 = effect2.parent;
    }
    throw error;
  }
  const STATUS_MASK = -7169;
  function set_signal_status(signal, status) {
    signal.f = signal.f & STATUS_MASK | status;
  }
  function update_derived_status(derived2) {
    if ((derived2.f & CONNECTED) !== 0 || derived2.deps === null) {
      set_signal_status(derived2, CLEAN);
    } else {
      set_signal_status(derived2, MAYBE_DIRTY);
    }
  }
  function clear_marked(deps) {
    if (deps === null) return;
    for (const dep of deps) {
      if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) {
        continue;
      }
      dep.f ^= WAS_MARKED;
      clear_marked(
        /** @type {Derived} */
        dep.deps
      );
    }
  }
  function defer_effect(effect2, dirty_effects, maybe_dirty_effects) {
    if ((effect2.f & DIRTY) !== 0) {
      dirty_effects.add(effect2);
    } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
      maybe_dirty_effects.add(effect2);
    }
    clear_marked(effect2.deps);
    set_signal_status(effect2, CLEAN);
  }
  const batches = /* @__PURE__ */ new Set();
  let current_batch = null;
  let batch_values = null;
  let queued_root_effects = [];
  let last_scheduled_effect = null;
  let is_flushing_sync = false;
  let collected_effects = null;
  let uid$1 = 1;
  class Batch {
    // for debugging. TODO remove once async is stable
    id = uid$1++;
    /**
     * The current values of any sources that are updated in this batch
     * They keys of this map are identical to `this.#previous`
     * @type {Map<Source, any>}
     */
    current = /* @__PURE__ */ new Map();
    /**
     * The values of any sources that are updated in this batch _before_ those updates took place.
     * They keys of this map are identical to `this.#current`
     * @type {Map<Source, any>}
     */
    previous = /* @__PURE__ */ new Map();
    /**
     * When the batch is committed (and the DOM is updated), we need to remove old branches
     * and append new ones by calling the functions added inside (if/each/key/etc) blocks
     * @type {Set<(batch: Batch) => void>}
     */
    #commit_callbacks = /* @__PURE__ */ new Set();
    /**
     * If a fork is discarded, we need to destroy any effects that are no longer needed
     * @type {Set<(batch: Batch) => void>}
     */
    #discard_callbacks = /* @__PURE__ */ new Set();
    /**
     * The number of async effects that are currently in flight
     */
    #pending = 0;
    /**
     * The number of async effects that are currently in flight, _not_ inside a pending boundary
     */
    #blocking_pending = 0;
    /**
     * A deferred that resolves when the batch is committed, used with `settled()`
     * TODO replace with Promise.withResolvers once supported widely enough
     * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
     */
    #deferred = null;
    /**
     * Deferred effects (which run after async work has completed) that are DIRTY
     * @type {Set<Effect>}
     */
    #dirty_effects = /* @__PURE__ */ new Set();
    /**
     * Deferred effects that are MAYBE_DIRTY
     * @type {Set<Effect>}
     */
    #maybe_dirty_effects = /* @__PURE__ */ new Set();
    /**
     * A map of branches that still exist, but will be destroyed when this batch
     * is committed — we skip over these during `process`.
     * The value contains child effects that were dirty/maybe_dirty before being reset,
     * so they can be rescheduled if the branch survives.
     * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
     */
    #skipped_branches = /* @__PURE__ */ new Map();
    is_fork = false;
    #decrement_queued = false;
    #is_deferred() {
      return this.is_fork || this.#blocking_pending > 0;
    }
    /**
     * Add an effect to the #skipped_branches map and reset its children
     * @param {Effect} effect
     */
    skip_effect(effect2) {
      if (!this.#skipped_branches.has(effect2)) {
        this.#skipped_branches.set(effect2, { d: [], m: [] });
      }
    }
    /**
     * Remove an effect from the #skipped_branches map and reschedule
     * any tracked dirty/maybe_dirty child effects
     * @param {Effect} effect
     */
    unskip_effect(effect2) {
      var tracked = this.#skipped_branches.get(effect2);
      if (tracked) {
        this.#skipped_branches.delete(effect2);
        for (var e of tracked.d) {
          set_signal_status(e, DIRTY);
          schedule_effect(e);
        }
        for (e of tracked.m) {
          set_signal_status(e, MAYBE_DIRTY);
          schedule_effect(e);
        }
      }
    }
    /**
     *
     * @param {Effect[]} root_effects
     */
    process(root_effects) {
      queued_root_effects = [];
      this.apply();
      var effects = collected_effects = [];
      var render_effects = [];
      for (const root2 of root_effects) {
        this.#traverse_effect_tree(root2, effects, render_effects);
      }
      collected_effects = null;
      if (this.#is_deferred()) {
        this.#defer_effects(render_effects);
        this.#defer_effects(effects);
        for (const [e, t] of this.#skipped_branches) {
          reset_branch(e, t);
        }
      } else {
        current_batch = null;
        for (const fn of this.#commit_callbacks) fn(this);
        this.#commit_callbacks.clear();
        if (this.#pending === 0) {
          this.#commit();
        }
        flush_queued_effects(render_effects);
        flush_queued_effects(effects);
        this.#dirty_effects.clear();
        this.#maybe_dirty_effects.clear();
        this.#deferred?.resolve();
      }
      batch_values = null;
    }
    /**
     * Traverse the effect tree, executing effects or stashing
     * them for later execution as appropriate
     * @param {Effect} root
     * @param {Effect[]} effects
     * @param {Effect[]} render_effects
     */
    #traverse_effect_tree(root2, effects, render_effects) {
      root2.f ^= CLEAN;
      var effect2 = root2.first;
      while (effect2 !== null) {
        var flags2 = effect2.f;
        var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
        var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
        var inert = (flags2 & INERT) !== 0;
        var skip = is_skippable_branch || this.#skipped_branches.has(effect2);
        if (!skip && effect2.fn !== null) {
          if (is_branch) {
            if (!inert) effect2.f ^= CLEAN;
          } else if ((flags2 & EFFECT) !== 0) {
            effects.push(effect2);
          } else if ((flags2 & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0 && inert) {
            render_effects.push(effect2);
          } else if (is_dirty(effect2)) {
            update_effect(effect2);
            if ((flags2 & BLOCK_EFFECT) !== 0) {
              this.#maybe_dirty_effects.add(effect2);
              if (inert) set_signal_status(effect2, DIRTY);
            }
          }
          var child2 = effect2.first;
          if (child2 !== null) {
            effect2 = child2;
            continue;
          }
        }
        while (effect2 !== null) {
          var next2 = effect2.next;
          if (next2 !== null) {
            effect2 = next2;
            break;
          }
          effect2 = effect2.parent;
        }
      }
    }
    /**
     * @param {Effect[]} effects
     */
    #defer_effects(effects) {
      for (var i = 0; i < effects.length; i += 1) {
        defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
      }
    }
    /**
     * Associate a change to a given source with the current
     * batch, noting its previous and current values
     * @param {Source} source
     * @param {any} value
     */
    capture(source2, value) {
      if (value !== UNINITIALIZED && !this.previous.has(source2)) {
        this.previous.set(source2, value);
      }
      if ((source2.f & ERROR_VALUE) === 0) {
        this.current.set(source2, source2.v);
        batch_values?.set(source2, source2.v);
      }
    }
    activate() {
      current_batch = this;
      this.apply();
    }
    deactivate() {
      if (current_batch !== this) return;
      current_batch = null;
      batch_values = null;
    }
    flush() {
      if (queued_root_effects.length > 0) {
        current_batch = this;
        flush_effects();
      } else if (this.#pending === 0 && !this.is_fork) {
        for (const fn of this.#commit_callbacks) fn(this);
        this.#commit_callbacks.clear();
        this.#commit();
        this.#deferred?.resolve();
      }
      this.deactivate();
    }
    discard() {
      for (const fn of this.#discard_callbacks) fn(this);
      this.#discard_callbacks.clear();
    }
    #commit() {
      if (batches.size > 1) {
        this.previous.clear();
        var previous_batch = current_batch;
        var previous_batch_values = batch_values;
        var is_earlier = true;
        for (const batch of batches) {
          if (batch === this) {
            is_earlier = false;
            continue;
          }
          const sources = [];
          for (const [source2, value] of this.current) {
            if (batch.current.has(source2)) {
              if (is_earlier && value !== batch.current.get(source2)) {
                batch.current.set(source2, value);
              } else {
                continue;
              }
            }
            sources.push(source2);
          }
          if (sources.length === 0) {
            continue;
          }
          const others = [...batch.current.keys()].filter((s) => !this.current.has(s));
          if (others.length > 0) {
            var prev_queued_root_effects = queued_root_effects;
            queued_root_effects = [];
            const marked = /* @__PURE__ */ new Set();
            const checked = /* @__PURE__ */ new Map();
            for (const source2 of sources) {
              mark_effects(source2, others, marked, checked);
            }
            if (queued_root_effects.length > 0) {
              current_batch = batch;
              batch.apply();
              for (const root2 of queued_root_effects) {
                batch.#traverse_effect_tree(root2, [], []);
              }
              batch.deactivate();
            }
            queued_root_effects = prev_queued_root_effects;
          }
        }
        current_batch = previous_batch;
        batch_values = previous_batch_values;
      }
      this.#skipped_branches.clear();
      batches.delete(this);
    }
    /**
     *
     * @param {boolean} blocking
     */
    increment(blocking) {
      this.#pending += 1;
      if (blocking) this.#blocking_pending += 1;
    }
    /**
     *
     * @param {boolean} blocking
     */
    decrement(blocking) {
      this.#pending -= 1;
      if (blocking) this.#blocking_pending -= 1;
      if (this.#decrement_queued) return;
      this.#decrement_queued = true;
      queue_micro_task(() => {
        this.#decrement_queued = false;
        if (!this.#is_deferred()) {
          this.revive();
        } else if (queued_root_effects.length > 0) {
          this.flush();
        }
      });
    }
    revive() {
      for (const e of this.#dirty_effects) {
        this.#maybe_dirty_effects.delete(e);
        set_signal_status(e, DIRTY);
        schedule_effect(e);
      }
      for (const e of this.#maybe_dirty_effects) {
        set_signal_status(e, MAYBE_DIRTY);
        schedule_effect(e);
      }
      this.flush();
    }
    /** @param {(batch: Batch) => void} fn */
    oncommit(fn) {
      this.#commit_callbacks.add(fn);
    }
    /** @param {(batch: Batch) => void} fn */
    ondiscard(fn) {
      this.#discard_callbacks.add(fn);
    }
    settled() {
      return (this.#deferred ??= deferred()).promise;
    }
    static ensure() {
      if (current_batch === null) {
        const batch = current_batch = new Batch();
        batches.add(current_batch);
        if (!is_flushing_sync) {
          queue_micro_task(() => {
            if (current_batch !== batch) {
              return;
            }
            batch.flush();
          });
        }
      }
      return current_batch;
    }
    apply() {
      return;
    }
  }
  function flushSync(fn) {
    var was_flushing_sync = is_flushing_sync;
    is_flushing_sync = true;
    try {
      var result;
      if (fn) ;
      while (true) {
        flush_tasks();
        if (queued_root_effects.length === 0) {
          current_batch?.flush();
          if (queued_root_effects.length === 0) {
            last_scheduled_effect = null;
            return (
              /** @type {T} */
              result
            );
          }
        }
        flush_effects();
      }
    } finally {
      is_flushing_sync = was_flushing_sync;
    }
  }
  function flush_effects() {
    var source_stacks = null;
    try {
      var flush_count = 0;
      while (queued_root_effects.length > 0) {
        var batch = Batch.ensure();
        if (flush_count++ > 1e3) {
          var updates, entry;
          if (DEV) ;
          infinite_loop_guard();
        }
        batch.process(queued_root_effects);
        old_values.clear();
        if (DEV) ;
      }
    } finally {
      queued_root_effects = [];
      last_scheduled_effect = null;
      collected_effects = null;
    }
  }
  function infinite_loop_guard() {
    try {
      effect_update_depth_exceeded();
    } catch (error) {
      invoke_error_boundary(error, last_scheduled_effect);
    }
  }
  let eager_block_effects = null;
  function flush_queued_effects(effects) {
    var length = effects.length;
    if (length === 0) return;
    var i = 0;
    while (i < length) {
      var effect2 = effects[i++];
      if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
        eager_block_effects = /* @__PURE__ */ new Set();
        update_effect(effect2);
        if (effect2.deps === null && effect2.first === null && effect2.nodes === null && effect2.teardown === null && effect2.ac === null) {
          unlink_effect(effect2);
        }
        if (eager_block_effects?.size > 0) {
          old_values.clear();
          for (const e of eager_block_effects) {
            if ((e.f & (DESTROYED | INERT)) !== 0) continue;
            const ordered_effects = [e];
            let ancestor = e.parent;
            while (ancestor !== null) {
              if (eager_block_effects.has(ancestor)) {
                eager_block_effects.delete(ancestor);
                ordered_effects.push(ancestor);
              }
              ancestor = ancestor.parent;
            }
            for (let j = ordered_effects.length - 1; j >= 0; j--) {
              const e2 = ordered_effects[j];
              if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
              update_effect(e2);
            }
          }
          eager_block_effects.clear();
        }
      }
    }
    eager_block_effects = null;
  }
  function mark_effects(value, sources, marked, checked) {
    if (marked.has(value)) return;
    marked.add(value);
    if (value.reactions !== null) {
      for (const reaction of value.reactions) {
        const flags2 = reaction.f;
        if ((flags2 & DERIVED) !== 0) {
          mark_effects(
            /** @type {Derived} */
            reaction,
            sources,
            marked,
            checked
          );
        } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && (flags2 & DIRTY) === 0 && depends_on(reaction, sources, checked)) {
          set_signal_status(reaction, DIRTY);
          schedule_effect(
            /** @type {Effect} */
            reaction
          );
        }
      }
    }
  }
  function depends_on(reaction, sources, checked) {
    const depends = checked.get(reaction);
    if (depends !== void 0) return depends;
    if (reaction.deps !== null) {
      for (const dep of reaction.deps) {
        if (includes.call(sources, dep)) {
          return true;
        }
        if ((dep.f & DERIVED) !== 0 && depends_on(
          /** @type {Derived} */
          dep,
          sources,
          checked
        )) {
          checked.set(
            /** @type {Derived} */
            dep,
            true
          );
          return true;
        }
      }
    }
    checked.set(reaction, false);
    return false;
  }
  function schedule_effect(signal) {
    var effect2 = last_scheduled_effect = signal;
    var boundary2 = effect2.b;
    if (boundary2?.is_pending && (signal.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 && (signal.f & REACTION_RAN) === 0) {
      boundary2.defer_effect(signal);
      return;
    }
    while (effect2.parent !== null) {
      effect2 = effect2.parent;
      var flags2 = effect2.f;
      if (collected_effects !== null && effect2 === active_effect) {
        if ((signal.f & RENDER_EFFECT) === 0) {
          return;
        }
      }
      if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
        if ((flags2 & CLEAN) === 0) {
          return;
        }
        effect2.f ^= CLEAN;
      }
    }
    queued_root_effects.push(effect2);
  }
  function reset_branch(effect2, tracked) {
    if ((effect2.f & BRANCH_EFFECT) !== 0 && (effect2.f & CLEAN) !== 0) {
      return;
    }
    if ((effect2.f & DIRTY) !== 0) {
      tracked.d.push(effect2);
    } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
      tracked.m.push(effect2);
    }
    set_signal_status(effect2, CLEAN);
    var e = effect2.first;
    while (e !== null) {
      reset_branch(e, tracked);
      e = e.next;
    }
  }
  function createSubscriber(start) {
    let subscribers = 0;
    let version = source(0);
    let stop;
    return () => {
      if (effect_tracking()) {
        get(version);
        render_effect(() => {
          if (subscribers === 0) {
            stop = untrack(() => start(() => increment(version)));
          }
          subscribers += 1;
          return () => {
            queue_micro_task(() => {
              subscribers -= 1;
              if (subscribers === 0) {
                stop?.();
                stop = void 0;
                increment(version);
              }
            });
          };
        });
      }
    };
  }
  var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
  function boundary(node, props, children, transform_error) {
    new Boundary(node, props, children, transform_error);
  }
  class Boundary {
    /** @type {Boundary | null} */
    parent;
    is_pending = false;
    /**
     * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
     * Inherited from parent boundary, or defaults to identity.
     * @type {(error: unknown) => unknown}
     */
    transform_error;
    /** @type {TemplateNode} */
    #anchor;
    /** @type {TemplateNode | null} */
    #hydrate_open = hydrating ? hydrate_node : null;
    /** @type {BoundaryProps} */
    #props;
    /** @type {((anchor: Node) => void)} */
    #children;
    /** @type {Effect} */
    #effect;
    /** @type {Effect | null} */
    #main_effect = null;
    /** @type {Effect | null} */
    #pending_effect = null;
    /** @type {Effect | null} */
    #failed_effect = null;
    /** @type {DocumentFragment | null} */
    #offscreen_fragment = null;
    #local_pending_count = 0;
    #pending_count = 0;
    #pending_count_update_queued = false;
    /** @type {Set<Effect>} */
    #dirty_effects = /* @__PURE__ */ new Set();
    /** @type {Set<Effect>} */
    #maybe_dirty_effects = /* @__PURE__ */ new Set();
    /**
     * A source containing the number of pending async deriveds/expressions.
     * Only created if `$effect.pending()` is used inside the boundary,
     * otherwise updating the source results in needless `Batch.ensure()`
     * calls followed by no-op flushes
     * @type {Source<number> | null}
     */
    #effect_pending = null;
    #effect_pending_subscriber = createSubscriber(() => {
      this.#effect_pending = source(this.#local_pending_count);
      return () => {
        this.#effect_pending = null;
      };
    });
    /**
     * @param {TemplateNode} node
     * @param {BoundaryProps} props
     * @param {((anchor: Node) => void)} children
     * @param {((error: unknown) => unknown) | undefined} [transform_error]
     */
    constructor(node, props, children, transform_error) {
      this.#anchor = node;
      this.#props = props;
      this.#children = (anchor) => {
        var effect2 = (
          /** @type {Effect} */
          active_effect
        );
        effect2.b = this;
        effect2.f |= BOUNDARY_EFFECT;
        children(anchor);
      };
      this.parent = /** @type {Effect} */
      active_effect.b;
      this.transform_error = transform_error ?? this.parent?.transform_error ?? ((e) => e);
      this.#effect = block(() => {
        if (hydrating) {
          const comment2 = (
            /** @type {Comment} */
            this.#hydrate_open
          );
          hydrate_next();
          const server_rendered_pending = comment2.data === HYDRATION_START_ELSE;
          const server_rendered_failed = comment2.data.startsWith(HYDRATION_START_FAILED);
          if (server_rendered_failed) {
            const serialized_error = JSON.parse(comment2.data.slice(HYDRATION_START_FAILED.length));
            this.#hydrate_failed_content(serialized_error);
          } else if (server_rendered_pending) {
            this.#hydrate_pending_content();
          } else {
            this.#hydrate_resolved_content();
          }
        } else {
          this.#render();
        }
      }, flags);
      if (hydrating) {
        this.#anchor = hydrate_node;
      }
    }
    #hydrate_resolved_content() {
      try {
        this.#main_effect = branch(() => this.#children(this.#anchor));
      } catch (error) {
        this.error(error);
      }
    }
    /**
     * @param {unknown} error The deserialized error from the server's hydration comment
     */
    #hydrate_failed_content(error) {
      const failed = this.#props.failed;
      if (!failed) return;
      this.#failed_effect = branch(() => {
        failed(
          this.#anchor,
          () => error,
          () => () => {
          }
        );
      });
    }
    #hydrate_pending_content() {
      const pending = this.#props.pending;
      if (!pending) return;
      this.is_pending = true;
      this.#pending_effect = branch(() => pending(this.#anchor));
      queue_micro_task(() => {
        var fragment = this.#offscreen_fragment = document.createDocumentFragment();
        var anchor = create_text();
        fragment.append(anchor);
        this.#main_effect = this.#run(() => {
          Batch.ensure();
          return branch(() => this.#children(anchor));
        });
        if (this.#pending_count === 0) {
          this.#anchor.before(fragment);
          this.#offscreen_fragment = null;
          pause_effect(
            /** @type {Effect} */
            this.#pending_effect,
            () => {
              this.#pending_effect = null;
            }
          );
          this.#resolve();
        }
      });
    }
    #render() {
      try {
        this.is_pending = this.has_pending_snippet();
        this.#pending_count = 0;
        this.#local_pending_count = 0;
        this.#main_effect = branch(() => {
          this.#children(this.#anchor);
        });
        if (this.#pending_count > 0) {
          var fragment = this.#offscreen_fragment = document.createDocumentFragment();
          move_effect(this.#main_effect, fragment);
          const pending = (
            /** @type {(anchor: Node) => void} */
            this.#props.pending
          );
          this.#pending_effect = branch(() => pending(this.#anchor));
        } else {
          this.#resolve();
        }
      } catch (error) {
        this.error(error);
      }
    }
    #resolve() {
      this.is_pending = false;
      for (const e of this.#dirty_effects) {
        set_signal_status(e, DIRTY);
        schedule_effect(e);
      }
      for (const e of this.#maybe_dirty_effects) {
        set_signal_status(e, MAYBE_DIRTY);
        schedule_effect(e);
      }
      this.#dirty_effects.clear();
      this.#maybe_dirty_effects.clear();
    }
    /**
     * Defer an effect inside a pending boundary until the boundary resolves
     * @param {Effect} effect
     */
    defer_effect(effect2) {
      defer_effect(effect2, this.#dirty_effects, this.#maybe_dirty_effects);
    }
    /**
     * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
     * @returns {boolean}
     */
    is_rendered() {
      return !this.is_pending && (!this.parent || this.parent.is_rendered());
    }
    has_pending_snippet() {
      return !!this.#props.pending;
    }
    /**
     * @template T
     * @param {() => T} fn
     */
    #run(fn) {
      var previous_effect = active_effect;
      var previous_reaction = active_reaction;
      var previous_ctx = component_context;
      set_active_effect(this.#effect);
      set_active_reaction(this.#effect);
      set_component_context(this.#effect.ctx);
      try {
        return fn();
      } catch (e) {
        handle_error(e);
        return null;
      } finally {
        set_active_effect(previous_effect);
        set_active_reaction(previous_reaction);
        set_component_context(previous_ctx);
      }
    }
    /**
     * Updates the pending count associated with the currently visible pending snippet,
     * if any, such that we can replace the snippet with content once work is done
     * @param {1 | -1} d
     */
    #update_pending_count(d) {
      if (!this.has_pending_snippet()) {
        if (this.parent) {
          this.parent.#update_pending_count(d);
        }
        return;
      }
      this.#pending_count += d;
      if (this.#pending_count === 0) {
        this.#resolve();
        if (this.#pending_effect) {
          pause_effect(this.#pending_effect, () => {
            this.#pending_effect = null;
          });
        }
        if (this.#offscreen_fragment) {
          this.#anchor.before(this.#offscreen_fragment);
          this.#offscreen_fragment = null;
        }
      }
    }
    /**
     * Update the source that powers `$effect.pending()` inside this boundary,
     * and controls when the current `pending` snippet (if any) is removed.
     * Do not call from inside the class
     * @param {1 | -1} d
     */
    update_pending_count(d) {
      this.#update_pending_count(d);
      this.#local_pending_count += d;
      if (!this.#effect_pending || this.#pending_count_update_queued) return;
      this.#pending_count_update_queued = true;
      queue_micro_task(() => {
        this.#pending_count_update_queued = false;
        if (this.#effect_pending) {
          internal_set(this.#effect_pending, this.#local_pending_count);
        }
      });
    }
    get_effect_pending() {
      this.#effect_pending_subscriber();
      return get(
        /** @type {Source<number>} */
        this.#effect_pending
      );
    }
    /** @param {unknown} error */
    error(error) {
      var onerror = this.#props.onerror;
      let failed = this.#props.failed;
      if (!onerror && !failed) {
        throw error;
      }
      if (this.#main_effect) {
        destroy_effect(this.#main_effect);
        this.#main_effect = null;
      }
      if (this.#pending_effect) {
        destroy_effect(this.#pending_effect);
        this.#pending_effect = null;
      }
      if (this.#failed_effect) {
        destroy_effect(this.#failed_effect);
        this.#failed_effect = null;
      }
      if (hydrating) {
        set_hydrate_node(
          /** @type {TemplateNode} */
          this.#hydrate_open
        );
        next();
        set_hydrate_node(skip_nodes());
      }
      var did_reset = false;
      var calling_on_error = false;
      const reset2 = () => {
        if (did_reset) {
          svelte_boundary_reset_noop();
          return;
        }
        did_reset = true;
        if (calling_on_error) {
          svelte_boundary_reset_onerror();
        }
        if (this.#failed_effect !== null) {
          pause_effect(this.#failed_effect, () => {
            this.#failed_effect = null;
          });
        }
        this.#run(() => {
          Batch.ensure();
          this.#render();
        });
      };
      const handle_error_result = (transformed_error) => {
        try {
          calling_on_error = true;
          onerror?.(transformed_error, reset2);
          calling_on_error = false;
        } catch (error2) {
          invoke_error_boundary(error2, this.#effect && this.#effect.parent);
        }
        if (failed) {
          this.#failed_effect = this.#run(() => {
            Batch.ensure();
            try {
              return branch(() => {
                var effect2 = (
                  /** @type {Effect} */
                  active_effect
                );
                effect2.b = this;
                effect2.f |= BOUNDARY_EFFECT;
                failed(
                  this.#anchor,
                  () => transformed_error,
                  () => reset2
                );
              });
            } catch (error2) {
              invoke_error_boundary(
                error2,
                /** @type {Effect} */
                this.#effect.parent
              );
              return null;
            }
          });
        }
      };
      queue_micro_task(() => {
        var result;
        try {
          result = this.transform_error(error);
        } catch (e) {
          invoke_error_boundary(e, this.#effect && this.#effect.parent);
          return;
        }
        if (result !== null && typeof result === "object" && typeof /** @type {any} */
        result.then === "function") {
          result.then(
            handle_error_result,
            /** @param {unknown} e */
            (e) => invoke_error_boundary(e, this.#effect && this.#effect.parent)
          );
        } else {
          handle_error_result(result);
        }
      });
    }
  }
  function flatten(blockers, sync, async, fn) {
    const d = derived;
    var pending = blockers.filter((b) => !b.settled);
    if (async.length === 0 && pending.length === 0) {
      fn(sync.map(d));
      return;
    }
    var parent = (
      /** @type {Effect} */
      active_effect
    );
    var restore = capture();
    var blocker_promise = pending.length === 1 ? pending[0].promise : pending.length > 1 ? Promise.all(pending.map((b) => b.promise)) : null;
    function finish(values) {
      restore();
      try {
        fn(values);
      } catch (error) {
        if ((parent.f & DESTROYED) === 0) {
          invoke_error_boundary(error, parent);
        }
      }
      unset_context();
    }
    if (async.length === 0) {
      blocker_promise.then(() => finish(sync.map(d)));
      return;
    }
    function run() {
      restore();
      Promise.all(async.map((expression) => /* @__PURE__ */ async_derived(expression))).then((result) => finish([...sync.map(d), ...result])).catch((error) => invoke_error_boundary(error, parent));
    }
    if (blocker_promise) {
      blocker_promise.then(run);
    } else {
      run();
    }
  }
  function capture() {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_component_context = component_context;
    var previous_batch = current_batch;
    return function restore(activate_batch = true) {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_component_context);
      if (activate_batch) previous_batch?.activate();
    };
  }
  function unset_context(deactivate_batch = true) {
    set_active_effect(null);
    set_active_reaction(null);
    set_component_context(null);
    if (deactivate_batch) current_batch?.deactivate();
  }
  function increment_pending() {
    var boundary2 = (
      /** @type {Boundary} */
      /** @type {Effect} */
      active_effect.b
    );
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    var blocking = boundary2.is_rendered();
    boundary2.update_pending_count(1);
    batch.increment(blocking);
    return () => {
      boundary2.update_pending_count(-1);
      batch.decrement(blocking);
    };
  }
  // @__NO_SIDE_EFFECTS__
  function derived(fn) {
    var flags2 = DERIVED | DIRTY;
    var parent_derived = active_reaction !== null && (active_reaction.f & DERIVED) !== 0 ? (
      /** @type {Derived} */
      active_reaction
    ) : null;
    if (active_effect !== null) {
      active_effect.f |= EFFECT_PRESERVED;
    }
    const signal = {
      ctx: component_context,
      deps: null,
      effects: null,
      equals,
      f: flags2,
      fn,
      reactions: null,
      rv: 0,
      v: (
        /** @type {V} */
        UNINITIALIZED
      ),
      wv: 0,
      parent: parent_derived ?? active_effect,
      ac: null
    };
    return signal;
  }
  // @__NO_SIDE_EFFECTS__
  function async_derived(fn, label, location) {
    let parent = (
      /** @type {Effect | null} */
      active_effect
    );
    if (parent === null) {
      async_derived_orphan();
    }
    var promise = (
      /** @type {Promise<V>} */
      /** @type {unknown} */
      void 0
    );
    var signal = source(
      /** @type {V} */
      UNINITIALIZED
    );
    var should_suspend = !active_reaction;
    var deferreds = /* @__PURE__ */ new Map();
    async_effect(() => {
      var d = deferred();
      promise = d.promise;
      try {
        Promise.resolve(fn()).then(d.resolve, d.reject).finally(unset_context);
      } catch (error) {
        d.reject(error);
        unset_context();
      }
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      if (should_suspend) {
        var decrement_pending = increment_pending();
        deferreds.get(batch)?.reject(STALE_REACTION);
        deferreds.delete(batch);
        deferreds.set(batch, d);
      }
      const handler = (value, error = void 0) => {
        batch.activate();
        if (error) {
          if (error !== STALE_REACTION) {
            signal.f |= ERROR_VALUE;
            internal_set(signal, error);
          }
        } else {
          if ((signal.f & ERROR_VALUE) !== 0) {
            signal.f ^= ERROR_VALUE;
          }
          internal_set(signal, value);
          for (const [b, d2] of deferreds) {
            deferreds.delete(b);
            if (b === batch) break;
            d2.reject(STALE_REACTION);
          }
        }
        if (decrement_pending) {
          decrement_pending();
        }
      };
      d.promise.then(handler, (e) => handler(null, e || "unknown"));
    });
    teardown(() => {
      for (const d of deferreds.values()) {
        d.reject(STALE_REACTION);
      }
    });
    return new Promise((fulfil) => {
      function next2(p) {
        function go() {
          if (p === promise) {
            fulfil(signal);
          } else {
            next2(promise);
          }
        }
        p.then(go, go);
      }
      next2(promise);
    });
  }
  // @__NO_SIDE_EFFECTS__
  function user_derived(fn) {
    const d = /* @__PURE__ */ derived(fn);
    push_reaction_value(d);
    return d;
  }
  // @__NO_SIDE_EFFECTS__
  function derived_safe_equal(fn) {
    const signal = /* @__PURE__ */ derived(fn);
    signal.equals = safe_equals;
    return signal;
  }
  function destroy_derived_effects(derived2) {
    var effects = derived2.effects;
    if (effects !== null) {
      derived2.effects = null;
      for (var i = 0; i < effects.length; i += 1) {
        destroy_effect(
          /** @type {Effect} */
          effects[i]
        );
      }
    }
  }
  function get_derived_parent_effect(derived2) {
    var parent = derived2.parent;
    while (parent !== null) {
      if ((parent.f & DERIVED) === 0) {
        return (parent.f & DESTROYED) === 0 ? (
          /** @type {Effect} */
          parent
        ) : null;
      }
      parent = parent.parent;
    }
    return null;
  }
  function execute_derived(derived2) {
    var value;
    var prev_active_effect = active_effect;
    set_active_effect(get_derived_parent_effect(derived2));
    {
      try {
        derived2.f &= ~WAS_MARKED;
        destroy_derived_effects(derived2);
        value = update_reaction(derived2);
      } finally {
        set_active_effect(prev_active_effect);
      }
    }
    return value;
  }
  function update_derived(derived2) {
    var value = execute_derived(derived2);
    if (!derived2.equals(value)) {
      derived2.wv = increment_write_version();
      if (!current_batch?.is_fork || derived2.deps === null) {
        derived2.v = value;
        if (derived2.deps === null) {
          set_signal_status(derived2, CLEAN);
          return;
        }
      }
    }
    if (is_destroying_effect) {
      return;
    }
    if (batch_values !== null) {
      if (effect_tracking() || current_batch?.is_fork) {
        batch_values.set(derived2, value);
      }
    } else {
      update_derived_status(derived2);
    }
  }
  function freeze_derived_effects(derived2) {
    if (derived2.effects === null) return;
    for (const e of derived2.effects) {
      if (e.teardown || e.ac) {
        e.teardown?.();
        e.ac?.abort(STALE_REACTION);
        e.teardown = noop;
        e.ac = null;
        remove_reactions(e, 0);
        destroy_effect_children(e);
      }
    }
  }
  function unfreeze_derived_effects(derived2) {
    if (derived2.effects === null) return;
    for (const e of derived2.effects) {
      if (e.teardown) {
        update_effect(e);
      }
    }
  }
  let eager_effects = /* @__PURE__ */ new Set();
  const old_values = /* @__PURE__ */ new Map();
  let eager_effects_deferred = false;
  function source(v, stack) {
    var signal = {
      f: 0,
      // TODO ideally we could skip this altogether, but it causes type errors
      v,
      reactions: null,
      equals,
      rv: 0,
      wv: 0
    };
    return signal;
  }
  // @__NO_SIDE_EFFECTS__
  function state(v, stack) {
    const s = source(v);
    push_reaction_value(s);
    return s;
  }
  // @__NO_SIDE_EFFECTS__
  function mutable_source(initial_value, immutable = false, trackable = true) {
    const s = source(initial_value);
    if (!immutable) {
      s.equals = safe_equals;
    }
    return s;
  }
  function set(source2, value, should_proxy = false) {
    if (active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
    // to ensure we error if state is set inside an inspect effect
    (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 && (current_sources === null || !includes.call(current_sources, source2))) {
      state_unsafe_mutation();
    }
    let new_value = should_proxy ? proxy(value) : value;
    return internal_set(source2, new_value);
  }
  function internal_set(source2, value) {
    if (!source2.equals(value)) {
      var old_value = source2.v;
      if (is_destroying_effect) {
        old_values.set(source2, value);
      } else {
        old_values.set(source2, old_value);
      }
      source2.v = value;
      var batch = Batch.ensure();
      batch.capture(source2, old_value);
      if ((source2.f & DERIVED) !== 0) {
        const derived2 = (
          /** @type {Derived} */
          source2
        );
        if ((source2.f & DIRTY) !== 0) {
          execute_derived(derived2);
        }
        update_derived_status(derived2);
      }
      source2.wv = increment_write_version();
      mark_reactions(source2, DIRTY);
      if (active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
        if (untracked_writes === null) {
          set_untracked_writes([source2]);
        } else {
          untracked_writes.push(source2);
        }
      }
      if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
        flush_eager_effects();
      }
    }
    return value;
  }
  function flush_eager_effects() {
    eager_effects_deferred = false;
    for (const effect2 of eager_effects) {
      if ((effect2.f & CLEAN) !== 0) {
        set_signal_status(effect2, MAYBE_DIRTY);
      }
      if (is_dirty(effect2)) {
        update_effect(effect2);
      }
    }
    eager_effects.clear();
  }
  function increment(source2) {
    set(source2, source2.v + 1);
  }
  function mark_reactions(signal, status) {
    var reactions = signal.reactions;
    if (reactions === null) return;
    var length = reactions.length;
    for (var i = 0; i < length; i++) {
      var reaction = reactions[i];
      var flags2 = reaction.f;
      var not_dirty = (flags2 & DIRTY) === 0;
      if (not_dirty) {
        set_signal_status(reaction, status);
      }
      if ((flags2 & DERIVED) !== 0) {
        var derived2 = (
          /** @type {Derived} */
          reaction
        );
        batch_values?.delete(derived2);
        if ((flags2 & WAS_MARKED) === 0) {
          if (flags2 & CONNECTED) {
            reaction.f |= WAS_MARKED;
          }
          mark_reactions(derived2, MAYBE_DIRTY);
        }
      } else if (not_dirty) {
        if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
          eager_block_effects.add(
            /** @type {Effect} */
            reaction
          );
        }
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
  function without_reactive_context(fn) {
    var previous_reaction = active_reaction;
    var previous_effect = active_effect;
    set_active_reaction(null);
    set_active_effect(null);
    try {
      return fn();
    } finally {
      set_active_reaction(previous_reaction);
      set_active_effect(previous_effect);
    }
  }
  let is_updating_effect = false;
  let is_destroying_effect = false;
  function set_is_destroying_effect(value) {
    is_destroying_effect = value;
  }
  let active_reaction = null;
  let untracking = false;
  function set_active_reaction(reaction) {
    active_reaction = reaction;
  }
  let active_effect = null;
  function set_active_effect(effect2) {
    active_effect = effect2;
  }
  let current_sources = null;
  function push_reaction_value(value) {
    if (active_reaction !== null && true) {
      if (current_sources === null) {
        current_sources = [value];
      } else {
        current_sources.push(value);
      }
    }
  }
  let new_deps = null;
  let skipped_deps = 0;
  let untracked_writes = null;
  function set_untracked_writes(value) {
    untracked_writes = value;
  }
  let write_version = 1;
  let read_version = 0;
  let update_version = read_version;
  function set_update_version(value) {
    update_version = value;
  }
  function increment_write_version() {
    return ++write_version;
  }
  function is_dirty(reaction) {
    var flags2 = reaction.f;
    if ((flags2 & DIRTY) !== 0) {
      return true;
    }
    if (flags2 & DERIVED) {
      reaction.f &= ~WAS_MARKED;
    }
    if ((flags2 & MAYBE_DIRTY) !== 0) {
      var dependencies = (
        /** @type {Value[]} */
        reaction.deps
      );
      var length = dependencies.length;
      for (var i = 0; i < length; i++) {
        var dependency = dependencies[i];
        if (is_dirty(
          /** @type {Derived} */
          dependency
        )) {
          update_derived(
            /** @type {Derived} */
            dependency
          );
        }
        if (dependency.wv > reaction.wv) {
          return true;
        }
      }
      if ((flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
      // traversal of the graph in the other batches still happens
      batch_values === null) {
        set_signal_status(reaction, CLEAN);
      }
    }
    return false;
  }
  function schedule_possible_effect_self_invalidation(signal, effect2, root2 = true) {
    var reactions = signal.reactions;
    if (reactions === null) return;
    if (current_sources !== null && includes.call(current_sources, signal)) {
      return;
    }
    for (var i = 0; i < reactions.length; i++) {
      var reaction = reactions[i];
      if ((reaction.f & DERIVED) !== 0) {
        schedule_possible_effect_self_invalidation(
          /** @type {Derived} */
          reaction,
          effect2,
          false
        );
      } else if (effect2 === reaction) {
        if (root2) {
          set_signal_status(reaction, DIRTY);
        } else if ((reaction.f & CLEAN) !== 0) {
          set_signal_status(reaction, MAYBE_DIRTY);
        }
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
  function update_reaction(reaction) {
    var previous_deps = new_deps;
    var previous_skipped_deps = skipped_deps;
    var previous_untracked_writes = untracked_writes;
    var previous_reaction = active_reaction;
    var previous_sources = current_sources;
    var previous_component_context = component_context;
    var previous_untracking = untracking;
    var previous_update_version = update_version;
    var flags2 = reaction.f;
    new_deps = /** @type {null | Value[]} */
    null;
    skipped_deps = 0;
    untracked_writes = null;
    active_reaction = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
    current_sources = null;
    set_component_context(reaction.ctx);
    untracking = false;
    update_version = ++read_version;
    if (reaction.ac !== null) {
      without_reactive_context(() => {
        reaction.ac.abort(STALE_REACTION);
      });
      reaction.ac = null;
    }
    try {
      reaction.f |= REACTION_IS_UPDATING;
      var fn = (
        /** @type {Function} */
        reaction.fn
      );
      var result = fn();
      reaction.f |= REACTION_RAN;
      var deps = reaction.deps;
      var is_fork = current_batch?.is_fork;
      if (new_deps !== null) {
        var i;
        if (!is_fork) {
          remove_reactions(reaction, skipped_deps);
        }
        if (deps !== null && skipped_deps > 0) {
          deps.length = skipped_deps + new_deps.length;
          for (i = 0; i < new_deps.length; i++) {
            deps[skipped_deps + i] = new_deps[i];
          }
        } else {
          reaction.deps = deps = new_deps;
        }
        if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
          for (i = skipped_deps; i < deps.length; i++) {
            (deps[i].reactions ??= []).push(reaction);
          }
        }
      } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
        remove_reactions(reaction, skipped_deps);
        deps.length = skipped_deps;
      }
      if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
        for (i = 0; i < /** @type {Source[]} */
        untracked_writes.length; i++) {
          schedule_possible_effect_self_invalidation(
            untracked_writes[i],
            /** @type {Effect} */
            reaction
          );
        }
      }
      if (previous_reaction !== null && previous_reaction !== reaction) {
        read_version++;
        if (previous_reaction.deps !== null) {
          for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
            previous_reaction.deps[i2].rv = read_version;
          }
        }
        if (previous_deps !== null) {
          for (const dep of previous_deps) {
            dep.rv = read_version;
          }
        }
        if (untracked_writes !== null) {
          if (previous_untracked_writes === null) {
            previous_untracked_writes = untracked_writes;
          } else {
            previous_untracked_writes.push(.../** @type {Source[]} */
            untracked_writes);
          }
        }
      }
      if ((reaction.f & ERROR_VALUE) !== 0) {
        reaction.f ^= ERROR_VALUE;
      }
      return result;
    } catch (error) {
      return handle_error(error);
    } finally {
      reaction.f ^= REACTION_IS_UPDATING;
      new_deps = previous_deps;
      skipped_deps = previous_skipped_deps;
      untracked_writes = previous_untracked_writes;
      active_reaction = previous_reaction;
      current_sources = previous_sources;
      set_component_context(previous_component_context);
      untracking = previous_untracking;
      update_version = previous_update_version;
    }
  }
  function remove_reaction(signal, dependency) {
    let reactions = dependency.reactions;
    if (reactions !== null) {
      var index2 = index_of.call(reactions, signal);
      if (index2 !== -1) {
        var new_length = reactions.length - 1;
        if (new_length === 0) {
          reactions = dependency.reactions = null;
        } else {
          reactions[index2] = reactions[new_length];
          reactions.pop();
        }
      }
    }
    if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
    // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
    // allows us to skip the expensive work of disconnecting and immediately reconnecting it
    (new_deps === null || !includes.call(new_deps, dependency))) {
      var derived2 = (
        /** @type {Derived} */
        dependency
      );
      if ((derived2.f & CONNECTED) !== 0) {
        derived2.f ^= CONNECTED;
        derived2.f &= ~WAS_MARKED;
      }
      update_derived_status(derived2);
      freeze_derived_effects(derived2);
      remove_reactions(derived2, 0);
    }
  }
  function remove_reactions(signal, start_index) {
    var dependencies = signal.deps;
    if (dependencies === null) return;
    for (var i = start_index; i < dependencies.length; i++) {
      remove_reaction(signal, dependencies[i]);
    }
  }
  function update_effect(effect2) {
    var flags2 = effect2.f;
    if ((flags2 & DESTROYED) !== 0) {
      return;
    }
    set_signal_status(effect2, CLEAN);
    var previous_effect = active_effect;
    var was_updating_effect = is_updating_effect;
    active_effect = effect2;
    is_updating_effect = true;
    try {
      if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
        destroy_block_effect_children(effect2);
      } else {
        destroy_effect_children(effect2);
      }
      execute_effect_teardown(effect2);
      var teardown2 = update_reaction(effect2);
      effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
      effect2.wv = write_version;
      var dep;
      if (DEV && tracing_mode_flag && (effect2.f & DIRTY) !== 0 && effect2.deps !== null) ;
    } finally {
      is_updating_effect = was_updating_effect;
      active_effect = previous_effect;
    }
  }
  async function tick() {
    await Promise.resolve();
    flushSync();
  }
  function get(signal) {
    var flags2 = signal.f;
    var is_derived = (flags2 & DERIVED) !== 0;
    if (active_reaction !== null && !untracking) {
      var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
      if (!destroyed && (current_sources === null || !includes.call(current_sources, signal))) {
        var deps = active_reaction.deps;
        if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
          if (signal.rv < read_version) {
            signal.rv = read_version;
            if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
              skipped_deps++;
            } else if (new_deps === null) {
              new_deps = [signal];
            } else {
              new_deps.push(signal);
            }
          }
        } else {
          (active_reaction.deps ??= []).push(signal);
          var reactions = signal.reactions;
          if (reactions === null) {
            signal.reactions = [active_reaction];
          } else if (!includes.call(reactions, active_reaction)) {
            reactions.push(active_reaction);
          }
        }
      }
    }
    if (is_destroying_effect && old_values.has(signal)) {
      return old_values.get(signal);
    }
    if (is_derived) {
      var derived2 = (
        /** @type {Derived} */
        signal
      );
      if (is_destroying_effect) {
        var value = derived2.v;
        if ((derived2.f & CLEAN) === 0 && derived2.reactions !== null || depends_on_old_values(derived2)) {
          value = execute_derived(derived2);
        }
        old_values.set(derived2, value);
        return value;
      }
      var should_connect = (derived2.f & CONNECTED) === 0 && !untracking && active_reaction !== null && (is_updating_effect || (active_reaction.f & CONNECTED) !== 0);
      var is_new = (derived2.f & REACTION_RAN) === 0;
      if (is_dirty(derived2)) {
        if (should_connect) {
          derived2.f |= CONNECTED;
        }
        update_derived(derived2);
      }
      if (should_connect && !is_new) {
        unfreeze_derived_effects(derived2);
        reconnect(derived2);
      }
    }
    if (batch_values?.has(signal)) {
      return batch_values.get(signal);
    }
    if ((signal.f & ERROR_VALUE) !== 0) {
      throw signal.v;
    }
    return signal.v;
  }
  function reconnect(derived2) {
    derived2.f |= CONNECTED;
    if (derived2.deps === null) return;
    for (const dep of derived2.deps) {
      (dep.reactions ??= []).push(derived2);
      if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
        unfreeze_derived_effects(
          /** @type {Derived} */
          dep
        );
        reconnect(
          /** @type {Derived} */
          dep
        );
      }
    }
  }
  function depends_on_old_values(derived2) {
    if (derived2.v === UNINITIALIZED) return true;
    if (derived2.deps === null) return false;
    for (const dep of derived2.deps) {
      if (old_values.has(dep)) {
        return true;
      }
      if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
        /** @type {Derived} */
        dep
      )) {
        return true;
      }
    }
    return false;
  }
  function untrack(fn) {
    var previous_untracking = untracking;
    try {
      untracking = true;
      return fn();
    } finally {
      untracking = previous_untracking;
    }
  }
  function validate_effect(rune) {
    if (active_effect === null) {
      if (active_reaction === null) {
        effect_orphan();
      }
      effect_in_unowned_derived();
    }
    if (is_destroying_effect) {
      effect_in_teardown();
    }
  }
  function push_effect(effect2, parent_effect) {
    var parent_last = parent_effect.last;
    if (parent_last === null) {
      parent_effect.last = parent_effect.first = effect2;
    } else {
      parent_last.next = effect2;
      effect2.prev = parent_last;
      parent_effect.last = effect2;
    }
  }
  function create_effect(type, fn) {
    var parent = active_effect;
    if (parent !== null && (parent.f & INERT) !== 0) {
      type |= INERT;
    }
    var effect2 = {
      ctx: component_context,
      deps: null,
      nodes: null,
      f: type | DIRTY | CONNECTED,
      first: null,
      fn,
      last: null,
      next: null,
      parent,
      b: parent && parent.b,
      prev: null,
      teardown: null,
      wv: 0,
      ac: null
    };
    var e = effect2;
    if ((type & EFFECT) !== 0) {
      if (collected_effects !== null) {
        collected_effects.push(effect2);
      } else {
        schedule_effect(effect2);
      }
    } else if (fn !== null) {
      try {
        update_effect(effect2);
      } catch (e2) {
        destroy_effect(effect2);
        throw e2;
      }
      if (e.deps === null && e.teardown === null && e.nodes === null && e.first === e.last && // either `null`, or a singular child
      (e.f & EFFECT_PRESERVED) === 0) {
        e = e.first;
        if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null) {
          e.f |= EFFECT_TRANSPARENT;
        }
      }
    }
    if (e !== null) {
      e.parent = parent;
      if (parent !== null) {
        push_effect(e, parent);
      }
      if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
        var derived2 = (
          /** @type {Derived} */
          active_reaction
        );
        (derived2.effects ??= []).push(e);
      }
    }
    return effect2;
  }
  function effect_tracking() {
    return active_reaction !== null && !untracking;
  }
  function teardown(fn) {
    const effect2 = create_effect(RENDER_EFFECT, null);
    set_signal_status(effect2, CLEAN);
    effect2.teardown = fn;
    return effect2;
  }
  function user_effect(fn) {
    validate_effect();
    var flags2 = (
      /** @type {Effect} */
      active_effect.f
    );
    var defer = !active_reaction && (flags2 & BRANCH_EFFECT) !== 0 && (flags2 & REACTION_RAN) === 0;
    if (defer) {
      var context = (
        /** @type {ComponentContext} */
        component_context
      );
      (context.e ??= []).push(fn);
    } else {
      return create_user_effect(fn);
    }
  }
  function create_user_effect(fn) {
    return create_effect(EFFECT | USER_EFFECT, fn);
  }
  function component_root(fn) {
    Batch.ensure();
    const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
    return (options = {}) => {
      return new Promise((fulfil) => {
        if (options.outro) {
          pause_effect(effect2, () => {
            destroy_effect(effect2);
            fulfil(void 0);
          });
        } else {
          destroy_effect(effect2);
          fulfil(void 0);
        }
      });
    };
  }
  function effect(fn) {
    return create_effect(EFFECT, fn);
  }
  function async_effect(fn) {
    return create_effect(ASYNC | EFFECT_PRESERVED, fn);
  }
  function render_effect(fn, flags2 = 0) {
    return create_effect(RENDER_EFFECT | flags2, fn);
  }
  function template_effect(fn, sync = [], async = [], blockers = []) {
    flatten(blockers, sync, async, (values) => {
      create_effect(RENDER_EFFECT, () => fn(...values.map(get)));
    });
  }
  function block(fn, flags2 = 0) {
    var effect2 = create_effect(BLOCK_EFFECT | flags2, fn);
    return effect2;
  }
  function branch(fn) {
    return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
  }
  function execute_effect_teardown(effect2) {
    var teardown2 = effect2.teardown;
    if (teardown2 !== null) {
      const previously_destroying_effect = is_destroying_effect;
      const previous_reaction = active_reaction;
      set_is_destroying_effect(true);
      set_active_reaction(null);
      try {
        teardown2.call(null);
      } finally {
        set_is_destroying_effect(previously_destroying_effect);
        set_active_reaction(previous_reaction);
      }
    }
  }
  function destroy_effect_children(signal, remove_dom = false) {
    var effect2 = signal.first;
    signal.first = signal.last = null;
    while (effect2 !== null) {
      const controller = effect2.ac;
      if (controller !== null) {
        without_reactive_context(() => {
          controller.abort(STALE_REACTION);
        });
      }
      var next2 = effect2.next;
      if ((effect2.f & ROOT_EFFECT) !== 0) {
        effect2.parent = null;
      } else {
        destroy_effect(effect2, remove_dom);
      }
      effect2 = next2;
    }
  }
  function destroy_block_effect_children(signal) {
    var effect2 = signal.first;
    while (effect2 !== null) {
      var next2 = effect2.next;
      if ((effect2.f & BRANCH_EFFECT) === 0) {
        destroy_effect(effect2);
      }
      effect2 = next2;
    }
  }
  function destroy_effect(effect2, remove_dom = true) {
    var removed = false;
    if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes !== null && effect2.nodes.end !== null) {
      remove_effect_dom(
        effect2.nodes.start,
        /** @type {TemplateNode} */
        effect2.nodes.end
      );
      removed = true;
    }
    destroy_effect_children(effect2, remove_dom && !removed);
    remove_reactions(effect2, 0);
    set_signal_status(effect2, DESTROYED);
    var transitions = effect2.nodes && effect2.nodes.t;
    if (transitions !== null) {
      for (const transition of transitions) {
        transition.stop();
      }
    }
    execute_effect_teardown(effect2);
    var parent = effect2.parent;
    if (parent !== null && parent.first !== null) {
      unlink_effect(effect2);
    }
    effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.fn = effect2.nodes = effect2.ac = null;
  }
  function remove_effect_dom(node, end) {
    while (node !== null) {
      var next2 = node === end ? null : /* @__PURE__ */ get_next_sibling(node);
      node.remove();
      node = next2;
    }
  }
  function unlink_effect(effect2) {
    var parent = effect2.parent;
    var prev = effect2.prev;
    var next2 = effect2.next;
    if (prev !== null) prev.next = next2;
    if (next2 !== null) next2.prev = prev;
    if (parent !== null) {
      if (parent.first === effect2) parent.first = next2;
      if (parent.last === effect2) parent.last = prev;
    }
  }
  function pause_effect(effect2, callback, destroy = true) {
    var transitions = [];
    pause_children(effect2, transitions, true);
    var fn = () => {
      if (destroy) destroy_effect(effect2);
      if (callback) callback();
    };
    var remaining = transitions.length;
    if (remaining > 0) {
      var check = () => --remaining || fn();
      for (var transition of transitions) {
        transition.out(check);
      }
    } else {
      fn();
    }
  }
  function pause_children(effect2, transitions, local) {
    if ((effect2.f & INERT) !== 0) return;
    effect2.f ^= INERT;
    var t = effect2.nodes && effect2.nodes.t;
    if (t !== null) {
      for (const transition of t) {
        if (transition.is_global || local) {
          transitions.push(transition);
        }
      }
    }
    var child2 = effect2.first;
    while (child2 !== null) {
      var sibling2 = child2.next;
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
      // it means the parent block effect was pruned. In that case,
      // transparency information was transferred to the branch effect.
      (child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0;
      pause_children(child2, transitions, transparent ? local : false);
      child2 = sibling2;
    }
  }
  function resume_effect(effect2) {
    resume_children(effect2, true);
  }
  function resume_children(effect2, local) {
    if ((effect2.f & INERT) === 0) return;
    effect2.f ^= INERT;
    var child2 = effect2.first;
    while (child2 !== null) {
      var sibling2 = child2.next;
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
      resume_children(child2, transparent ? local : false);
      child2 = sibling2;
    }
    var t = effect2.nodes && effect2.nodes.t;
    if (t !== null) {
      for (const transition of t) {
        if (transition.is_global || local) {
          transition.in();
        }
      }
    }
  }
  function move_effect(effect2, fragment) {
    if (!effect2.nodes) return;
    var node = effect2.nodes.start;
    var end = effect2.nodes.end;
    while (node !== null) {
      var next2 = node === end ? null : /* @__PURE__ */ get_next_sibling(node);
      fragment.append(node);
      node = next2;
    }
  }
  const event_symbol = /* @__PURE__ */ Symbol("events");
  const all_registered_events = /* @__PURE__ */ new Set();
  const root_event_handles = /* @__PURE__ */ new Set();
  function create_event(event_name, dom, handler, options = {}) {
    function target_handler(event2) {
      if (!options.capture) {
        handle_event_propagation.call(dom, event2);
      }
      if (!event2.cancelBubble) {
        return without_reactive_context(() => {
          return handler?.call(this, event2);
        });
      }
    }
    if (event_name.startsWith("pointer") || event_name.startsWith("touch") || event_name === "wheel") {
      queue_micro_task(() => {
        dom.addEventListener(event_name, target_handler, options);
      });
    } else {
      dom.addEventListener(event_name, target_handler, options);
    }
    return target_handler;
  }
  function event(event_name, dom, handler, capture2, passive) {
    var options = { capture: capture2, passive };
    var target_handler = create_event(event_name, dom, handler, options);
    if (dom === document.body || // @ts-ignore
    dom === window || // @ts-ignore
    dom === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
    dom instanceof HTMLMediaElement) {
      teardown(() => {
        dom.removeEventListener(event_name, target_handler, options);
      });
    }
  }
  function delegated(event_name, element, handler) {
    (element[event_symbol] ??= {})[event_name] = handler;
  }
  function delegate(events) {
    for (var i = 0; i < events.length; i++) {
      all_registered_events.add(events[i]);
    }
    for (var fn of root_event_handles) {
      fn(events);
    }
  }
  let last_propagated_event = null;
  function handle_event_propagation(event2) {
    var handler_element = this;
    var owner_document = (
      /** @type {Node} */
      handler_element.ownerDocument
    );
    var event_name = event2.type;
    var path = event2.composedPath?.() || [];
    var current_target = (
      /** @type {null | Element} */
      path[0] || event2.target
    );
    last_propagated_event = event2;
    var path_idx = 0;
    var handled_at = last_propagated_event === event2 && event2[event_symbol];
    if (handled_at) {
      var at_idx = path.indexOf(handled_at);
      if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
      window)) {
        event2[event_symbol] = handler_element;
        return;
      }
      var handler_idx = path.indexOf(handler_element);
      if (handler_idx === -1) {
        return;
      }
      if (at_idx <= handler_idx) {
        path_idx = at_idx;
      }
    }
    current_target = /** @type {Element} */
    path[path_idx] || event2.target;
    if (current_target === handler_element) return;
    define_property(event2, "currentTarget", {
      configurable: true,
      get() {
        return current_target || owner_document;
      }
    });
    var previous_reaction = active_reaction;
    var previous_effect = active_effect;
    set_active_reaction(null);
    set_active_effect(null);
    try {
      var throw_error;
      var other_errors = [];
      while (current_target !== null) {
        var parent_element = current_target.assignedSlot || current_target.parentNode || /** @type {any} */
        current_target.host || null;
        try {
          var delegated2 = current_target[event_symbol]?.[event_name];
          if (delegated2 != null && (!/** @type {any} */
          current_target.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          event2.target === current_target)) {
            delegated2.call(current_target, event2);
          }
        } catch (error) {
          if (throw_error) {
            other_errors.push(error);
          } else {
            throw_error = error;
          }
        }
        if (event2.cancelBubble || parent_element === handler_element || parent_element === null) {
          break;
        }
        current_target = parent_element;
      }
      if (throw_error) {
        for (let error of other_errors) {
          queueMicrotask(() => {
            throw error;
          });
        }
        throw throw_error;
      }
    } finally {
      event2[event_symbol] = handler_element;
      delete event2.currentTarget;
      set_active_reaction(previous_reaction);
      set_active_effect(previous_effect);
    }
  }
  const policy = (
    // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
    globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", {
      /** @param {string} html */
      createHTML: (html) => {
        return html;
      }
    })
  );
  function create_trusted_html(html) {
    return (
      /** @type {string} */
      policy?.createHTML(html) ?? html
    );
  }
  function create_fragment_from_html(html) {
    var elem = create_element("template");
    elem.innerHTML = create_trusted_html(html.replaceAll("<!>", "<!---->"));
    return elem.content;
  }
  function assign_nodes(start, end) {
    var effect2 = (
      /** @type {Effect} */
      active_effect
    );
    if (effect2.nodes === null) {
      effect2.nodes = { start, end, a: null, t: null };
    }
  }
  // @__NO_SIDE_EFFECTS__
  function from_html(content, flags2) {
    var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
    var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
    var node;
    var has_start = !content.startsWith("<!>");
    return () => {
      if (hydrating) {
        assign_nodes(hydrate_node, null);
        return hydrate_node;
      }
      if (node === void 0) {
        node = create_fragment_from_html(has_start ? content : "<!>" + content);
        if (!is_fragment) node = /** @type {TemplateNode} */
        /* @__PURE__ */ get_first_child(node);
      }
      var clone = (
        /** @type {TemplateNode} */
        use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
      );
      if (is_fragment) {
        var start = (
          /** @type {TemplateNode} */
          /* @__PURE__ */ get_first_child(clone)
        );
        var end = (
          /** @type {TemplateNode} */
          clone.lastChild
        );
        assign_nodes(start, end);
      } else {
        assign_nodes(clone, clone);
      }
      return clone;
    };
  }
  function text(value = "") {
    if (!hydrating) {
      var t = create_text(value + "");
      assign_nodes(t, t);
      return t;
    }
    var node = hydrate_node;
    if (node.nodeType !== TEXT_NODE) {
      node.before(node = create_text());
      set_hydrate_node(node);
    } else {
      merge_text_nodes(
        /** @type {Text} */
        node
      );
    }
    assign_nodes(node, node);
    return node;
  }
  function comment() {
    if (hydrating) {
      assign_nodes(hydrate_node, null);
      return hydrate_node;
    }
    var frag = document.createDocumentFragment();
    var start = document.createComment("");
    var anchor = create_text();
    frag.append(start, anchor);
    assign_nodes(start, anchor);
    return frag;
  }
  function append(anchor, dom) {
    if (hydrating) {
      var effect2 = (
        /** @type {Effect & { nodes: EffectNodes }} */
        active_effect
      );
      if ((effect2.f & REACTION_RAN) === 0 || effect2.nodes.end === null) {
        effect2.nodes.end = hydrate_node;
      }
      hydrate_next();
      return;
    }
    if (anchor === null) {
      return;
    }
    anchor.before(
      /** @type {Node} */
      dom
    );
  }
  const PASSIVE_EVENTS = ["touchstart", "touchmove"];
  function is_passive_event(name) {
    return PASSIVE_EVENTS.includes(name);
  }
  function set_text(text2, value) {
    var str = value == null ? "" : typeof value === "object" ? `${value}` : value;
    if (str !== (text2.__t ??= text2.nodeValue)) {
      text2.__t = str;
      text2.nodeValue = `${str}`;
    }
  }
  function mount(component2, options) {
    return _mount(component2, options);
  }
  function hydrate(component2, options) {
    init_operations();
    options.intro = options.intro ?? false;
    const target = options.target;
    const was_hydrating = hydrating;
    const previous_hydrate_node = hydrate_node;
    try {
      var anchor = /* @__PURE__ */ get_first_child(target);
      while (anchor && (anchor.nodeType !== COMMENT_NODE || /** @type {Comment} */
      anchor.data !== HYDRATION_START)) {
        anchor = /* @__PURE__ */ get_next_sibling(anchor);
      }
      if (!anchor) {
        throw HYDRATION_ERROR;
      }
      set_hydrating(true);
      set_hydrate_node(
        /** @type {Comment} */
        anchor
      );
      const instance = _mount(component2, { ...options, anchor });
      set_hydrating(false);
      return (
        /**  @type {Exports} */
        instance
      );
    } catch (error) {
      if (error instanceof Error && error.message.split("\n").some((line) => line.startsWith("https://svelte.dev/e/"))) {
        throw error;
      }
      if (error !== HYDRATION_ERROR) {
        console.warn("Failed to hydrate: ", error);
      }
      if (options.recover === false) {
        hydration_failed();
      }
      init_operations();
      clear_text_content(target);
      set_hydrating(false);
      return mount(component2, options);
    } finally {
      set_hydrating(was_hydrating);
      set_hydrate_node(previous_hydrate_node);
    }
  }
  const listeners = /* @__PURE__ */ new Map();
  function _mount(Component, { target, anchor, props = {}, events, context, intro = true, transformError }) {
    init_operations();
    var component2 = void 0;
    var unmount2 = component_root(() => {
      var anchor_node = anchor ?? target.appendChild(create_text());
      boundary(
        /** @type {TemplateNode} */
        anchor_node,
        {
          pending: () => {
          }
        },
        (anchor_node2) => {
          push({});
          var ctx = (
            /** @type {ComponentContext} */
            component_context
          );
          if (context) ctx.c = context;
          if (events) {
            props.$$events = events;
          }
          if (hydrating) {
            assign_nodes(
              /** @type {TemplateNode} */
              anchor_node2,
              null
            );
          }
          component2 = Component(anchor_node2, props) || {};
          if (hydrating) {
            active_effect.nodes.end = hydrate_node;
            if (hydrate_node === null || hydrate_node.nodeType !== COMMENT_NODE || /** @type {Comment} */
            hydrate_node.data !== HYDRATION_END) {
              hydration_mismatch();
              throw HYDRATION_ERROR;
            }
          }
          pop();
        },
        transformError
      );
      var registered_events = /* @__PURE__ */ new Set();
      var event_handle = (events2) => {
        for (var i = 0; i < events2.length; i++) {
          var event_name = events2[i];
          if (registered_events.has(event_name)) continue;
          registered_events.add(event_name);
          var passive = is_passive_event(event_name);
          for (const node of [target, document]) {
            var counts = listeners.get(node);
            if (counts === void 0) {
              counts = /* @__PURE__ */ new Map();
              listeners.set(node, counts);
            }
            var count = counts.get(event_name);
            if (count === void 0) {
              node.addEventListener(event_name, handle_event_propagation, { passive });
              counts.set(event_name, 1);
            } else {
              counts.set(event_name, count + 1);
            }
          }
        }
      };
      event_handle(array_from(all_registered_events));
      root_event_handles.add(event_handle);
      return () => {
        for (var event_name of registered_events) {
          for (const node of [target, document]) {
            var counts = (
              /** @type {Map<string, number>} */
              listeners.get(node)
            );
            var count = (
              /** @type {number} */
              counts.get(event_name)
            );
            if (--count == 0) {
              node.removeEventListener(event_name, handle_event_propagation);
              counts.delete(event_name);
              if (counts.size === 0) {
                listeners.delete(node);
              }
            } else {
              counts.set(event_name, count);
            }
          }
        }
        root_event_handles.delete(event_handle);
        if (anchor_node !== anchor) {
          anchor_node.parentNode?.removeChild(anchor_node);
        }
      };
    });
    mounted_components.set(component2, unmount2);
    return component2;
  }
  let mounted_components = /* @__PURE__ */ new WeakMap();
  function unmount(component2, options) {
    const fn = mounted_components.get(component2);
    if (fn) {
      mounted_components.delete(component2);
      return fn(options);
    }
    return Promise.resolve();
  }
  function asClassComponent(component2) {
    return class extends Svelte4Component {
      /** @param {any} options */
      constructor(options) {
        super({
          component: component2,
          ...options
        });
      }
    };
  }
  class Svelte4Component {
    /** @type {any} */
    #events;
    /** @type {Record<string, any>} */
    #instance;
    /**
     * @param {ComponentConstructorOptions & {
     *  component: any;
     * }} options
     */
    constructor(options) {
      var sources = /* @__PURE__ */ new Map();
      var add_source = (key, value) => {
        var s = /* @__PURE__ */ mutable_source(value, false, false);
        sources.set(key, s);
        return s;
      };
      const props = new Proxy(
        { ...options.props || {}, $$events: {} },
        {
          get(target, prop2) {
            return get(sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)));
          },
          has(target, prop2) {
            if (prop2 === LEGACY_PROPS) return true;
            get(sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)));
            return Reflect.has(target, prop2);
          },
          set(target, prop2, value) {
            set(sources.get(prop2) ?? add_source(prop2, value), value);
            return Reflect.set(target, prop2, value);
          }
        }
      );
      this.#instance = (options.hydrate ? hydrate : mount)(options.component, {
        target: options.target,
        anchor: options.anchor,
        props,
        context: options.context,
        intro: options.intro ?? false,
        recover: options.recover,
        transformError: options.transformError
      });
      if (!options?.props?.$$host || options.sync === false) {
        flushSync();
      }
      this.#events = props.$$events;
      for (const key of Object.keys(this.#instance)) {
        if (key === "$set" || key === "$destroy" || key === "$on") continue;
        define_property(this, key, {
          get() {
            return this.#instance[key];
          },
          /** @param {any} value */
          set(value) {
            this.#instance[key] = value;
          },
          enumerable: true
        });
      }
      this.#instance.$set = /** @param {Record<string, any>} next */
      (next2) => {
        Object.assign(props, next2);
      };
      this.#instance.$destroy = () => {
        unmount(this.#instance);
      };
    }
    /** @param {Record<string, any>} props */
    $set(props) {
      this.#instance.$set(props);
    }
    /**
     * @param {string} event
     * @param {(...args: any[]) => any} callback
     * @returns {any}
     */
    $on(event2, callback) {
      this.#events[event2] = this.#events[event2] || [];
      const cb = (...args) => callback.call(this, ...args);
      this.#events[event2].push(cb);
      return () => {
        this.#events[event2] = this.#events[event2].filter(
          /** @param {any} fn */
          (fn) => fn !== cb
        );
      };
    }
    $destroy() {
      this.#instance.$destroy();
    }
  }
  const PUBLIC_VERSION = "5";
  if (typeof window !== "undefined") {
    ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(PUBLIC_VERSION);
  }
  class BranchManager {
    /** @type {TemplateNode} */
    anchor;
    /** @type {Map<Batch, Key>} */
    #batches = /* @__PURE__ */ new Map();
    /**
     * Map of keys to effects that are currently rendered in the DOM.
     * These effects are visible and actively part of the document tree.
     * Example:
     * ```
     * {#if condition}
     * 	foo
     * {:else}
     * 	bar
     * {/if}
     * ```
     * Can result in the entries `true->Effect` and `false->Effect`
     * @type {Map<Key, Effect>}
     */
    #onscreen = /* @__PURE__ */ new Map();
    /**
     * Similar to #onscreen with respect to the keys, but contains branches that are not yet
     * in the DOM, because their insertion is deferred.
     * @type {Map<Key, Branch>}
     */
    #offscreen = /* @__PURE__ */ new Map();
    /**
     * Keys of effects that are currently outroing
     * @type {Set<Key>}
     */
    #outroing = /* @__PURE__ */ new Set();
    /**
     * Whether to pause (i.e. outro) on change, or destroy immediately.
     * This is necessary for `<svelte:element>`
     */
    #transition = true;
    /**
     * @param {TemplateNode} anchor
     * @param {boolean} transition
     */
    constructor(anchor, transition = true) {
      this.anchor = anchor;
      this.#transition = transition;
    }
    /**
     * @param {Batch} batch
     */
    #commit = (batch) => {
      if (!this.#batches.has(batch)) return;
      var key = (
        /** @type {Key} */
        this.#batches.get(batch)
      );
      var onscreen = this.#onscreen.get(key);
      if (onscreen) {
        resume_effect(onscreen);
        this.#outroing.delete(key);
      } else {
        var offscreen = this.#offscreen.get(key);
        if (offscreen && (offscreen.effect.f & INERT) === 0) {
          this.#onscreen.set(key, offscreen.effect);
          this.#offscreen.delete(key);
          offscreen.fragment.lastChild.remove();
          this.anchor.before(offscreen.fragment);
          onscreen = offscreen.effect;
        }
      }
      for (const [b, k] of this.#batches) {
        this.#batches.delete(b);
        if (b === batch) {
          break;
        }
        const offscreen2 = this.#offscreen.get(k);
        if (offscreen2) {
          destroy_effect(offscreen2.effect);
          this.#offscreen.delete(k);
        }
      }
      for (const [k, effect2] of this.#onscreen) {
        if (k === key || this.#outroing.has(k)) continue;
        if ((effect2.f & INERT) !== 0) continue;
        const on_destroy = () => {
          const keys = Array.from(this.#batches.values());
          if (keys.includes(k)) {
            var fragment = document.createDocumentFragment();
            move_effect(effect2, fragment);
            fragment.append(create_text());
            this.#offscreen.set(k, { effect: effect2, fragment });
          } else {
            destroy_effect(effect2);
          }
          this.#outroing.delete(k);
          this.#onscreen.delete(k);
        };
        if (this.#transition || !onscreen) {
          this.#outroing.add(k);
          pause_effect(effect2, on_destroy, false);
        } else {
          on_destroy();
        }
      }
    };
    /**
     * @param {Batch} batch
     */
    #discard = (batch) => {
      this.#batches.delete(batch);
      const keys = Array.from(this.#batches.values());
      for (const [k, branch2] of this.#offscreen) {
        if (!keys.includes(k)) {
          destroy_effect(branch2.effect);
          this.#offscreen.delete(k);
        }
      }
    };
    /**
     *
     * @param {any} key
     * @param {null | ((target: TemplateNode) => void)} fn
     */
    ensure(key, fn) {
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      var defer = should_defer_append();
      if (fn && !this.#onscreen.has(key) && !this.#offscreen.has(key)) {
        if (defer) {
          var fragment = document.createDocumentFragment();
          var target = create_text();
          fragment.append(target);
          this.#offscreen.set(key, {
            effect: branch(() => fn(target)),
            fragment
          });
        } else {
          this.#onscreen.set(
            key,
            branch(() => fn(this.anchor))
          );
        }
      }
      this.#batches.set(batch, key);
      if (defer) {
        for (const [k, effect2] of this.#onscreen) {
          if (k === key) {
            batch.unskip_effect(effect2);
          } else {
            batch.skip_effect(effect2);
          }
        }
        for (const [k, branch2] of this.#offscreen) {
          if (k === key) {
            batch.unskip_effect(branch2.effect);
          } else {
            batch.skip_effect(branch2.effect);
          }
        }
        batch.oncommit(this.#commit);
        batch.ondiscard(this.#discard);
      } else {
        if (hydrating) {
          this.anchor = hydrate_node;
        }
        this.#commit(batch);
      }
    }
  }
  function snippet(node, get_snippet, ...args) {
    var branches = new BranchManager(node);
    block(() => {
      const snippet2 = get_snippet() ?? null;
      branches.ensure(snippet2, snippet2 && ((anchor) => snippet2(anchor, ...args)));
    }, EFFECT_TRANSPARENT);
  }
  function onMount(fn) {
    if (component_context === null) {
      lifecycle_outside_component();
    }
    {
      user_effect(() => {
        const cleanup = untrack(fn);
        if (typeof cleanup === "function") return (
          /** @type {() => void} */
          cleanup
        );
      });
    }
  }
  function if_block(node, fn, elseif = false) {
    var marker;
    if (hydrating) {
      marker = hydrate_node;
      hydrate_next();
    }
    var branches = new BranchManager(node);
    var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
    function update_branch(key, fn2) {
      if (hydrating) {
        var data = read_hydration_instruction(
          /** @type {TemplateNode} */
          marker
        );
        if (key !== parseInt(data.substring(1))) {
          var anchor = skip_nodes();
          set_hydrate_node(anchor);
          branches.anchor = anchor;
          set_hydrating(false);
          branches.ensure(key, fn2);
          set_hydrating(true);
          return;
        }
      }
      branches.ensure(key, fn2);
    }
    block(() => {
      var has_branch = false;
      fn((fn2, key = 0) => {
        has_branch = true;
        update_branch(key, fn2);
      });
      if (!has_branch) {
        update_branch(-1, null);
      }
    }, flags2);
  }
  function index(_, i) {
    return i;
  }
  function pause_effects(state2, to_destroy, controlled_anchor) {
    var transitions = [];
    var length = to_destroy.length;
    var group;
    var remaining = to_destroy.length;
    for (var i = 0; i < length; i++) {
      let effect2 = to_destroy[i];
      pause_effect(
        effect2,
        () => {
          if (group) {
            group.pending.delete(effect2);
            group.done.add(effect2);
            if (group.pending.size === 0) {
              var groups = (
                /** @type {Set<EachOutroGroup>} */
                state2.outrogroups
              );
              destroy_effects(state2, array_from(group.done));
              groups.delete(group);
              if (groups.size === 0) {
                state2.outrogroups = null;
              }
            }
          } else {
            remaining -= 1;
          }
        },
        false
      );
    }
    if (remaining === 0) {
      var fast_path = transitions.length === 0 && controlled_anchor !== null;
      if (fast_path) {
        var anchor = (
          /** @type {Element} */
          controlled_anchor
        );
        var parent_node = (
          /** @type {Element} */
          anchor.parentNode
        );
        clear_text_content(parent_node);
        parent_node.append(anchor);
        state2.items.clear();
      }
      destroy_effects(state2, to_destroy, !fast_path);
    } else {
      group = {
        pending: new Set(to_destroy),
        done: /* @__PURE__ */ new Set()
      };
      (state2.outrogroups ??= /* @__PURE__ */ new Set()).add(group);
    }
  }
  function destroy_effects(state2, to_destroy, remove_dom = true) {
    var preserved_effects;
    if (state2.pending.size > 0) {
      preserved_effects = /* @__PURE__ */ new Set();
      for (const keys of state2.pending.values()) {
        for (const key of keys) {
          preserved_effects.add(
            /** @type {EachItem} */
            state2.items.get(key).e
          );
        }
      }
    }
    for (var i = 0; i < to_destroy.length; i++) {
      var e = to_destroy[i];
      if (preserved_effects?.has(e)) {
        e.f |= EFFECT_OFFSCREEN;
        const fragment = document.createDocumentFragment();
        move_effect(e, fragment);
      } else {
        destroy_effect(to_destroy[i], remove_dom);
      }
    }
  }
  var offscreen_anchor;
  function each(node, flags2, get_collection, get_key, render_fn, fallback_fn = null) {
    var anchor = node;
    var items = /* @__PURE__ */ new Map();
    var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
    if (is_controlled) {
      var parent_node = (
        /** @type {Element} */
        node
      );
      anchor = hydrating ? set_hydrate_node(/* @__PURE__ */ get_first_child(parent_node)) : parent_node.appendChild(create_text());
    }
    if (hydrating) {
      hydrate_next();
    }
    var fallback = null;
    var each_array = /* @__PURE__ */ derived_safe_equal(() => {
      var collection = get_collection();
      return is_array(collection) ? collection : collection == null ? [] : array_from(collection);
    });
    var array;
    var pending = /* @__PURE__ */ new Map();
    var first_run = true;
    function commit(batch) {
      if ((state2.effect.f & DESTROYED) !== 0) {
        return;
      }
      state2.pending.delete(batch);
      state2.fallback = fallback;
      reconcile(state2, array, anchor, flags2, get_key);
      if (fallback !== null) {
        if (array.length === 0) {
          if ((fallback.f & EFFECT_OFFSCREEN) === 0) {
            resume_effect(fallback);
          } else {
            fallback.f ^= EFFECT_OFFSCREEN;
            move(fallback, null, anchor);
          }
        } else {
          pause_effect(fallback, () => {
            fallback = null;
          });
        }
      }
    }
    function discard(batch) {
      state2.pending.delete(batch);
    }
    var effect2 = block(() => {
      array = /** @type {V[]} */
      get(each_array);
      var length = array.length;
      let mismatch = false;
      if (hydrating) {
        var is_else = read_hydration_instruction(anchor) === HYDRATION_START_ELSE;
        if (is_else !== (length === 0)) {
          anchor = skip_nodes();
          set_hydrate_node(anchor);
          set_hydrating(false);
          mismatch = true;
        }
      }
      var keys = /* @__PURE__ */ new Set();
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      var defer = should_defer_append();
      for (var index2 = 0; index2 < length; index2 += 1) {
        if (hydrating && hydrate_node.nodeType === COMMENT_NODE && /** @type {Comment} */
        hydrate_node.data === HYDRATION_END) {
          anchor = /** @type {Comment} */
          hydrate_node;
          mismatch = true;
          set_hydrating(false);
        }
        var value = array[index2];
        var key = get_key(value, index2);
        var item = first_run ? null : items.get(key);
        if (item) {
          if (item.v) internal_set(item.v, value);
          if (item.i) internal_set(item.i, index2);
          if (defer) {
            batch.unskip_effect(item.e);
          }
        } else {
          item = create_item(
            items,
            first_run ? anchor : offscreen_anchor ??= create_text(),
            value,
            key,
            index2,
            render_fn,
            flags2,
            get_collection
          );
          if (!first_run) {
            item.e.f |= EFFECT_OFFSCREEN;
          }
          items.set(key, item);
        }
        keys.add(key);
      }
      if (length === 0 && fallback_fn && !fallback) {
        if (first_run) {
          fallback = branch(() => fallback_fn(anchor));
        } else {
          fallback = branch(() => fallback_fn(offscreen_anchor ??= create_text()));
          fallback.f |= EFFECT_OFFSCREEN;
        }
      }
      if (length > keys.size) {
        {
          each_key_duplicate();
        }
      }
      if (hydrating && length > 0) {
        set_hydrate_node(skip_nodes());
      }
      if (!first_run) {
        pending.set(batch, keys);
        if (defer) {
          for (const [key2, item2] of items) {
            if (!keys.has(key2)) {
              batch.skip_effect(item2.e);
            }
          }
          batch.oncommit(commit);
          batch.ondiscard(discard);
        } else {
          commit(batch);
        }
      }
      if (mismatch) {
        set_hydrating(true);
      }
      get(each_array);
    });
    var state2 = { effect: effect2, items, pending, outrogroups: null, fallback };
    first_run = false;
    if (hydrating) {
      anchor = hydrate_node;
    }
  }
  function skip_to_branch(effect2) {
    while (effect2 !== null && (effect2.f & BRANCH_EFFECT) === 0) {
      effect2 = effect2.next;
    }
    return effect2;
  }
  function reconcile(state2, array, anchor, flags2, get_key) {
    var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
    var length = array.length;
    var items = state2.items;
    var current = skip_to_branch(state2.effect.first);
    var seen;
    var prev = null;
    var to_animate;
    var matched = [];
    var stashed = [];
    var value;
    var key;
    var effect2;
    var i;
    if (is_animated) {
      for (i = 0; i < length; i += 1) {
        value = array[i];
        key = get_key(value, i);
        effect2 = /** @type {EachItem} */
        items.get(key).e;
        if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
          effect2.nodes?.a?.measure();
          (to_animate ??= /* @__PURE__ */ new Set()).add(effect2);
        }
      }
    }
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key = get_key(value, i);
      effect2 = /** @type {EachItem} */
      items.get(key).e;
      if (state2.outrogroups !== null) {
        for (const group of state2.outrogroups) {
          group.pending.delete(effect2);
          group.done.delete(effect2);
        }
      }
      if ((effect2.f & EFFECT_OFFSCREEN) !== 0) {
        effect2.f ^= EFFECT_OFFSCREEN;
        if (effect2 === current) {
          move(effect2, null, anchor);
        } else {
          var next2 = prev ? prev.next : current;
          if (effect2 === state2.effect.last) {
            state2.effect.last = effect2.prev;
          }
          if (effect2.prev) effect2.prev.next = effect2.next;
          if (effect2.next) effect2.next.prev = effect2.prev;
          link(state2, prev, effect2);
          link(state2, effect2, next2);
          move(effect2, next2, anchor);
          prev = effect2;
          matched = [];
          stashed = [];
          current = skip_to_branch(prev.next);
          continue;
        }
      }
      if ((effect2.f & INERT) !== 0) {
        resume_effect(effect2);
        if (is_animated) {
          effect2.nodes?.a?.unfix();
          (to_animate ??= /* @__PURE__ */ new Set()).delete(effect2);
        }
      }
      if (effect2 !== current) {
        if (seen !== void 0 && seen.has(effect2)) {
          if (matched.length < stashed.length) {
            var start = stashed[0];
            var j;
            prev = start.prev;
            var a = matched[0];
            var b = matched[matched.length - 1];
            for (j = 0; j < matched.length; j += 1) {
              move(matched[j], start, anchor);
            }
            for (j = 0; j < stashed.length; j += 1) {
              seen.delete(stashed[j]);
            }
            link(state2, a.prev, b.next);
            link(state2, prev, a);
            link(state2, b, start);
            current = start;
            prev = b;
            i -= 1;
            matched = [];
            stashed = [];
          } else {
            seen.delete(effect2);
            move(effect2, current, anchor);
            link(state2, effect2.prev, effect2.next);
            link(state2, effect2, prev === null ? state2.effect.first : prev.next);
            link(state2, prev, effect2);
            prev = effect2;
          }
          continue;
        }
        matched = [];
        stashed = [];
        while (current !== null && current !== effect2) {
          (seen ??= /* @__PURE__ */ new Set()).add(current);
          stashed.push(current);
          current = skip_to_branch(current.next);
        }
        if (current === null) {
          continue;
        }
      }
      if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
        matched.push(effect2);
      }
      prev = effect2;
      current = skip_to_branch(effect2.next);
    }
    if (state2.outrogroups !== null) {
      for (const group of state2.outrogroups) {
        if (group.pending.size === 0) {
          destroy_effects(state2, array_from(group.done));
          state2.outrogroups?.delete(group);
        }
      }
      if (state2.outrogroups.size === 0) {
        state2.outrogroups = null;
      }
    }
    if (current !== null || seen !== void 0) {
      var to_destroy = [];
      if (seen !== void 0) {
        for (effect2 of seen) {
          if ((effect2.f & INERT) === 0) {
            to_destroy.push(effect2);
          }
        }
      }
      while (current !== null) {
        if ((current.f & INERT) === 0 && current !== state2.fallback) {
          to_destroy.push(current);
        }
        current = skip_to_branch(current.next);
      }
      var destroy_length = to_destroy.length;
      if (destroy_length > 0) {
        var controlled_anchor = (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
        if (is_animated) {
          for (i = 0; i < destroy_length; i += 1) {
            to_destroy[i].nodes?.a?.measure();
          }
          for (i = 0; i < destroy_length; i += 1) {
            to_destroy[i].nodes?.a?.fix();
          }
        }
        pause_effects(state2, to_destroy, controlled_anchor);
      }
    }
    if (is_animated) {
      queue_micro_task(() => {
        if (to_animate === void 0) return;
        for (effect2 of to_animate) {
          effect2.nodes?.a?.apply();
        }
      });
    }
  }
  function create_item(items, anchor, value, key, index2, render_fn, flags2, get_collection) {
    var v = (flags2 & EACH_ITEM_REACTIVE) !== 0 ? (flags2 & EACH_ITEM_IMMUTABLE) === 0 ? /* @__PURE__ */ mutable_source(value, false, false) : source(value) : null;
    var i = (flags2 & EACH_INDEX_REACTIVE) !== 0 ? source(index2) : null;
    return {
      v,
      i,
      e: branch(() => {
        render_fn(anchor, v ?? value, i ?? index2, get_collection);
        return () => {
          items.delete(key);
        };
      })
    };
  }
  function move(effect2, next2, anchor) {
    if (!effect2.nodes) return;
    var node = effect2.nodes.start;
    var end = effect2.nodes.end;
    var dest = next2 && (next2.f & EFFECT_OFFSCREEN) === 0 ? (
      /** @type {EffectNodes} */
      next2.nodes.start
    ) : anchor;
    while (node !== null) {
      var next_node = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ get_next_sibling(node)
      );
      dest.before(node);
      if (node === end) {
        return;
      }
      node = next_node;
    }
  }
  function link(state2, prev, next2) {
    if (prev === null) {
      state2.effect.first = next2;
    } else {
      prev.next = next2;
    }
    if (next2 === null) {
      state2.effect.last = prev;
    } else {
      next2.prev = prev;
    }
  }
  function component(node, get_component, render_fn) {
    var hydration_start_node;
    if (hydrating) {
      hydration_start_node = hydrate_node;
      hydrate_next();
    }
    var branches = new BranchManager(node);
    block(() => {
      var component2 = get_component() ?? null;
      if (hydrating) {
        var data = read_hydration_instruction(
          /** @type {TemplateNode} */
          hydration_start_node
        );
        var server_had_component = data === HYDRATION_START;
        var client_has_component = component2 !== null;
        if (server_had_component !== client_has_component) {
          var anchor = skip_nodes();
          set_hydrate_node(anchor);
          branches.anchor = anchor;
          set_hydrating(false);
          branches.ensure(component2, component2 && ((target) => render_fn(target, component2)));
          set_hydrating(true);
          return;
        }
      }
      branches.ensure(component2, component2 && ((target) => render_fn(target, component2)));
    }, EFFECT_TRANSPARENT);
  }
  const whitespace = [..." 	\n\r\f \v\uFEFF"];
  function to_class(value, hash, directives) {
    var classname = value == null ? "" : "" + value;
    if (directives) {
      for (var key of Object.keys(directives)) {
        if (directives[key]) {
          classname = classname ? classname + " " + key : key;
        } else if (classname.length) {
          var len = key.length;
          var a = 0;
          while ((a = classname.indexOf(key, a)) >= 0) {
            var b = a + len;
            if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
              classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
            } else {
              a = b;
            }
          }
        }
      }
    }
    return classname === "" ? null : classname;
  }
  function append_styles(styles, important = false) {
    var separator = important ? " !important;" : ";";
    var css = "";
    for (var key of Object.keys(styles)) {
      var value = styles[key];
      if (value != null && value !== "") {
        css += " " + key + ": " + value + separator;
      }
    }
    return css;
  }
  function to_css_name(name) {
    if (name[0] !== "-" || name[1] !== "-") {
      return name.toLowerCase();
    }
    return name;
  }
  function to_style(value, styles) {
    if (styles) {
      var new_style = "";
      var normal_styles;
      var important_styles;
      if (Array.isArray(styles)) {
        normal_styles = styles[0];
        important_styles = styles[1];
      } else {
        normal_styles = styles;
      }
      if (value) {
        value = String(value).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
        var in_str = false;
        var in_apo = 0;
        var in_comment = false;
        var reserved_names = [];
        if (normal_styles) {
          reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
        }
        if (important_styles) {
          reserved_names.push(...Object.keys(important_styles).map(to_css_name));
        }
        var start_index = 0;
        var name_index = -1;
        const len = value.length;
        for (var i = 0; i < len; i++) {
          var c = value[i];
          if (in_comment) {
            if (c === "/" && value[i - 1] === "*") {
              in_comment = false;
            }
          } else if (in_str) {
            if (in_str === c) {
              in_str = false;
            }
          } else if (c === "/" && value[i + 1] === "*") {
            in_comment = true;
          } else if (c === '"' || c === "'") {
            in_str = c;
          } else if (c === "(") {
            in_apo++;
          } else if (c === ")") {
            in_apo--;
          }
          if (!in_comment && in_str === false && in_apo === 0) {
            if (c === ":" && name_index === -1) {
              name_index = i;
            } else if (c === ";" || i === len - 1) {
              if (name_index !== -1) {
                var name = to_css_name(value.substring(start_index, name_index).trim());
                if (!reserved_names.includes(name)) {
                  if (c !== ";") {
                    i++;
                  }
                  var property = value.substring(start_index, i).trim();
                  new_style += " " + property + ";";
                }
              }
              start_index = i + 1;
              name_index = -1;
            }
          }
        }
      }
      if (normal_styles) {
        new_style += append_styles(normal_styles);
      }
      if (important_styles) {
        new_style += append_styles(important_styles, true);
      }
      new_style = new_style.trim();
      return new_style === "" ? null : new_style;
    }
    return value == null ? null : String(value);
  }
  function set_class(dom, is_html, value, hash, prev_classes, next_classes) {
    var prev = dom.__className;
    if (hydrating || prev !== value || prev === void 0) {
      var next_class_name = to_class(value, hash, next_classes);
      if (!hydrating || next_class_name !== dom.getAttribute("class")) {
        if (next_class_name == null) {
          dom.removeAttribute("class");
        } else {
          dom.className = next_class_name;
        }
      }
      dom.__className = value;
    } else if (next_classes && prev_classes !== next_classes) {
      for (var key in next_classes) {
        var is_present = !!next_classes[key];
        if (prev_classes == null || is_present !== !!prev_classes[key]) {
          dom.classList.toggle(key, is_present);
        }
      }
    }
    return next_classes;
  }
  function update_styles(dom, prev = {}, next2, priority) {
    for (var key in next2) {
      var value = next2[key];
      if (prev[key] !== value) {
        if (next2[key] == null) {
          dom.style.removeProperty(key);
        } else {
          dom.style.setProperty(key, value, priority);
        }
      }
    }
  }
  function set_style(dom, value, prev_styles, next_styles) {
    var prev = dom.__style;
    if (hydrating || prev !== value) {
      var next_style_attr = to_style(value, next_styles);
      if (!hydrating || next_style_attr !== dom.getAttribute("style")) {
        if (next_style_attr == null) {
          dom.removeAttribute("style");
        } else {
          dom.style.cssText = next_style_attr;
        }
      }
      dom.__style = value;
    } else if (next_styles) {
      if (Array.isArray(next_styles)) {
        update_styles(dom, prev_styles?.[0], next_styles[0]);
        update_styles(dom, prev_styles?.[1], next_styles[1], "important");
      } else {
        update_styles(dom, prev_styles, next_styles);
      }
    }
    return next_styles;
  }
  const IS_CUSTOM_ELEMENT = /* @__PURE__ */ Symbol("is custom element");
  const IS_HTML = /* @__PURE__ */ Symbol("is html");
  const LINK_TAG = IS_XHTML ? "link" : "LINK";
  function set_attribute(element, attribute, value, skip_warning) {
    var attributes = get_attributes(element);
    if (hydrating) {
      attributes[attribute] = element.getAttribute(attribute);
      if (attribute === "src" || attribute === "srcset" || attribute === "href" && element.nodeName === LINK_TAG) {
        return;
      }
    }
    if (attributes[attribute] === (attributes[attribute] = value)) return;
    if (attribute === "loading") {
      element[LOADING_ATTR_SYMBOL] = value;
    }
    if (value == null) {
      element.removeAttribute(attribute);
    } else if (typeof value !== "string" && get_setters(element).includes(attribute)) {
      element[attribute] = value;
    } else {
      element.setAttribute(attribute, value);
    }
  }
  function get_attributes(element) {
    return (
      /** @type {Record<string | symbol, unknown>} **/
      // @ts-expect-error
      element.__attributes ??= {
        [IS_CUSTOM_ELEMENT]: element.nodeName.includes("-"),
        [IS_HTML]: element.namespaceURI === NAMESPACE_HTML
      }
    );
  }
  var setters_cache = /* @__PURE__ */ new Map();
  function get_setters(element) {
    var cache_key = element.getAttribute("is") || element.nodeName;
    var setters = setters_cache.get(cache_key);
    if (setters) return setters;
    setters_cache.set(cache_key, setters = []);
    var descriptors;
    var proto = element;
    var element_proto = Element.prototype;
    while (element_proto !== proto) {
      descriptors = get_descriptors(proto);
      for (var key in descriptors) {
        if (descriptors[key].set) {
          setters.push(key);
        }
      }
      proto = get_prototype_of(proto);
    }
    return setters;
  }
  function is_bound_this(bound_value, element_or_component) {
    return bound_value === element_or_component || bound_value?.[STATE_SYMBOL] === element_or_component;
  }
  function bind_this(element_or_component = {}, update, get_value, get_parts) {
    effect(() => {
      var old_parts;
      var parts;
      render_effect(() => {
        old_parts = parts;
        parts = [];
        untrack(() => {
          if (element_or_component !== get_value(...parts)) {
            update(element_or_component, ...parts);
            if (old_parts && is_bound_this(get_value(...old_parts), element_or_component)) {
              update(null, ...old_parts);
            }
          }
        });
      });
      return () => {
        queue_micro_task(() => {
          if (parts && is_bound_this(get_value(...parts), element_or_component)) {
            update(null, ...parts);
          }
        });
      };
    });
    return element_or_component;
  }
  let is_store_binding = false;
  function capture_store_binding(fn) {
    var previous_is_store_binding = is_store_binding;
    try {
      is_store_binding = false;
      return [fn(), is_store_binding];
    } finally {
      is_store_binding = previous_is_store_binding;
    }
  }
  const rest_props_handler = {
    get(target, key) {
      if (target.exclude.includes(key)) return;
      return target.props[key];
    },
    set(target, key) {
      return false;
    },
    getOwnPropertyDescriptor(target, key) {
      if (target.exclude.includes(key)) return;
      if (key in target.props) {
        return {
          enumerable: true,
          configurable: true,
          value: target.props[key]
        };
      }
    },
    has(target, key) {
      if (target.exclude.includes(key)) return false;
      return key in target.props;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target.props).filter((key) => !target.exclude.includes(key));
    }
  };
  // @__NO_SIDE_EFFECTS__
  function rest_props(props, exclude, name) {
    return new Proxy(
      { props, exclude },
      rest_props_handler
    );
  }
  const spread_props_handler = {
    get(target, key) {
      let i = target.props.length;
      while (i--) {
        let p = target.props[i];
        if (is_function(p)) p = p();
        if (typeof p === "object" && p !== null && key in p) return p[key];
      }
    },
    set(target, key, value) {
      let i = target.props.length;
      while (i--) {
        let p = target.props[i];
        if (is_function(p)) p = p();
        const desc = get_descriptor(p, key);
        if (desc && desc.set) {
          desc.set(value);
          return true;
        }
      }
      return false;
    },
    getOwnPropertyDescriptor(target, key) {
      let i = target.props.length;
      while (i--) {
        let p = target.props[i];
        if (is_function(p)) p = p();
        if (typeof p === "object" && p !== null && key in p) {
          const descriptor = get_descriptor(p, key);
          if (descriptor && !descriptor.configurable) {
            descriptor.configurable = true;
          }
          return descriptor;
        }
      }
    },
    has(target, key) {
      if (key === STATE_SYMBOL || key === LEGACY_PROPS) return false;
      for (let p of target.props) {
        if (is_function(p)) p = p();
        if (p != null && key in p) return true;
      }
      return false;
    },
    ownKeys(target) {
      const keys = [];
      for (let p of target.props) {
        if (is_function(p)) p = p();
        if (!p) continue;
        for (const key in p) {
          if (!keys.includes(key)) keys.push(key);
        }
        for (const key of Object.getOwnPropertySymbols(p)) {
          if (!keys.includes(key)) keys.push(key);
        }
      }
      return keys;
    }
  };
  function spread_props(...props) {
    return new Proxy({ props }, spread_props_handler);
  }
  function prop(props, key, flags2, fallback) {
    var bindable = (flags2 & PROPS_IS_BINDABLE) !== 0;
    var lazy = (flags2 & PROPS_IS_LAZY_INITIAL) !== 0;
    var fallback_value = (
      /** @type {V} */
      fallback
    );
    var fallback_dirty = true;
    var get_fallback = () => {
      if (fallback_dirty) {
        fallback_dirty = false;
        fallback_value = lazy ? untrack(
          /** @type {() => V} */
          fallback
        ) : (
          /** @type {V} */
          fallback
        );
      }
      return fallback_value;
    };
    var setter;
    if (bindable) {
      var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;
      setter = get_descriptor(props, key)?.set ?? (is_entry_props && key in props ? (v) => props[key] = v : void 0);
    }
    var initial_value;
    var is_store_sub = false;
    if (bindable) {
      [initial_value, is_store_sub] = capture_store_binding(() => (
        /** @type {V} */
        props[key]
      ));
    } else {
      initial_value = /** @type {V} */
      props[key];
    }
    if (initial_value === void 0 && fallback !== void 0) {
      initial_value = get_fallback();
      if (setter) {
        props_invalid_value();
        setter(initial_value);
      }
    }
    var getter;
    {
      getter = () => {
        var value = (
          /** @type {V} */
          props[key]
        );
        if (value === void 0) return get_fallback();
        fallback_dirty = true;
        return value;
      };
    }
    if ((flags2 & PROPS_IS_UPDATED) === 0) {
      return getter;
    }
    if (setter) {
      var legacy_parent = props.$$legacy;
      return (
        /** @type {() => V} */
        (function(value, mutation) {
          if (arguments.length > 0) {
            if (!mutation || legacy_parent || is_store_sub) {
              setter(mutation ? getter() : value);
            }
            return value;
          }
          return getter();
        })
      );
    }
    var overridden = false;
    var d = ((flags2 & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(() => {
      overridden = false;
      return getter();
    });
    if (bindable) get(d);
    var parent_effect = (
      /** @type {Effect} */
      active_effect
    );
    return (
      /** @type {() => V} */
      (function(value, mutation) {
        if (arguments.length > 0) {
          const new_value = mutation ? get(d) : bindable ? proxy(value) : value;
          set(d, new_value);
          overridden = true;
          if (fallback_value !== void 0) {
            fallback_value = new_value;
          }
          return value;
        }
        if (is_destroying_effect && overridden || (parent_effect.f & DESTROYED) !== 0) {
          return d.v;
        }
        return get(d);
      })
    );
  }
  class SvelteMap extends Map {
    /** @type {Map<K, Source<number>>} */
    #sources = /* @__PURE__ */ new Map();
    #version = /* @__PURE__ */ state(0);
    #size = /* @__PURE__ */ state(0);
    #update_version = update_version || -1;
    /**
     * @param {Iterable<readonly [K, V]> | null | undefined} [value]
     */
    constructor(value) {
      super();
      if (value) {
        for (var [key, v] of value) {
          super.set(key, v);
        }
        this.#size.v = super.size;
      }
    }
    /**
     * If the source is being created inside the same reaction as the SvelteMap instance,
     * we use `state` so that it will not be a dependency of the reaction. Otherwise we
     * use `source` so it will be.
     *
     * @template T
     * @param {T} value
     * @returns {Source<T>}
     */
    #source(value) {
      return update_version === this.#update_version ? /* @__PURE__ */ state(value) : source(value);
    }
    /** @param {K} key */
    has(key) {
      var sources = this.#sources;
      var s = sources.get(key);
      if (s === void 0) {
        if (super.has(key)) {
          s = this.#source(0);
          sources.set(key, s);
        } else {
          get(this.#version);
          return false;
        }
      }
      get(s);
      return true;
    }
    /**
     * @param {(value: V, key: K, map: Map<K, V>) => void} callbackfn
     * @param {any} [this_arg]
     */
    forEach(callbackfn, this_arg) {
      this.#read_all();
      super.forEach(callbackfn, this_arg);
    }
    /** @param {K} key */
    get(key) {
      var sources = this.#sources;
      var s = sources.get(key);
      if (s === void 0) {
        if (super.has(key)) {
          s = this.#source(0);
          sources.set(key, s);
        } else {
          get(this.#version);
          return void 0;
        }
      }
      get(s);
      return super.get(key);
    }
    /**
     * @param {K} key
     * @param {V} value
     * */
    set(key, value) {
      var sources = this.#sources;
      var s = sources.get(key);
      var prev_res = super.get(key);
      var res = super.set(key, value);
      var version = this.#version;
      if (s === void 0) {
        s = this.#source(0);
        sources.set(key, s);
        set(this.#size, super.size);
        increment(version);
      } else if (prev_res !== value) {
        increment(s);
        var v_reactions = version.reactions === null ? null : new Set(version.reactions);
        var needs_version_increase = v_reactions === null || !s.reactions?.every(
          (r) => (
            /** @type {NonNullable<typeof v_reactions>} */
            v_reactions.has(r)
          )
        );
        if (needs_version_increase) {
          increment(version);
        }
      }
      return res;
    }
    /** @param {K} key */
    delete(key) {
      var sources = this.#sources;
      var s = sources.get(key);
      var res = super.delete(key);
      if (s !== void 0) {
        sources.delete(key);
        set(s, -1);
      }
      if (res) {
        set(this.#size, super.size);
        increment(this.#version);
      }
      return res;
    }
    clear() {
      if (super.size === 0) {
        return;
      }
      super.clear();
      var sources = this.#sources;
      set(this.#size, 0);
      for (var s of sources.values()) {
        set(s, -1);
      }
      increment(this.#version);
      sources.clear();
    }
    #read_all() {
      get(this.#version);
      var sources = this.#sources;
      if (this.#size.v !== sources.size) {
        for (var key of super.keys()) {
          if (!sources.has(key)) {
            var s = this.#source(0);
            sources.set(key, s);
          }
        }
      }
      for ([, s] of this.#sources) {
        get(s);
      }
    }
    keys() {
      get(this.#version);
      return super.keys();
    }
    values() {
      this.#read_all();
      return super.values();
    }
    entries() {
      this.#read_all();
      return super.entries();
    }
    [Symbol.iterator]() {
      return this.entries();
    }
    get size() {
      get(this.#size);
      return super.size;
    }
  }
  const constructFromSymbol = /* @__PURE__ */ Symbol.for("constructDateFrom");
  function constructFrom(date, value) {
    if (typeof date === "function") return date(value);
    if (date && typeof date === "object" && constructFromSymbol in date)
      return date[constructFromSymbol](value);
    if (date instanceof Date) return new date.constructor(value);
    return new Date(value);
  }
  function toDate(argument, context) {
    return constructFrom(context || argument, argument);
  }
  function addDays(date, amount, options) {
    const _date = toDate(date, options?.in);
    if (isNaN(amount)) return constructFrom(date, NaN);
    if (!amount) return _date;
    _date.setDate(_date.getDate() + amount);
    return _date;
  }
  let defaultOptions = {};
  function getDefaultOptions() {
    return defaultOptions;
  }
  function startOfWeek$1(date, options) {
    const defaultOptions2 = getDefaultOptions();
    const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions2.weekStartsOn ?? defaultOptions2.locale?.options?.weekStartsOn ?? 0;
    const _date = toDate(date, options?.in);
    const day = _date.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    _date.setDate(_date.getDate() - diff);
    _date.setHours(0, 0, 0, 0);
    return _date;
  }
  function startOfDay(date, options) {
    const _date = toDate(date, options?.in);
    _date.setHours(0, 0, 0, 0);
    return _date;
  }
  function getDate(date, options) {
    return toDate(date, options?.in).getDate();
  }
  function getHours(date, options) {
    return toDate(date, options?.in).getHours();
  }
  function getMinutes(date, options) {
    return toDate(date, options?.in).getMinutes();
  }
  function getSeconds(date) {
    return toDate(date).getSeconds();
  }
  const DAY_MS = 864e5;
  const HOUR_MS = 36e5;
  Array.from({ length: 24 }, (_, i) => i);
  function sod(ms) {
    return startOfDay(ms).getTime();
  }
  function startOfWeek(ms, mondayStart = true) {
    return startOfWeek$1(ms, { weekStartsOn: mondayStart ? 1 : 0 }).getTime();
  }
  function addDaysMs(ms, n) {
    return addDays(ms, n).getTime();
  }
  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function fractionalHour(ms) {
    const d = new Date(ms);
    return getHours(d) + getMinutes(d) / 60 + getSeconds(d) / 3600;
  }
  function fmtHM(ms) {
    const d = new Date(ms);
    return pad(getHours(d)) + ":" + pad(getMinutes(d));
  }
  function fmtS(ms) {
    return ":" + pad(getSeconds(new Date(ms)));
  }
  function dayNum(ms) {
    return getDate(new Date(ms));
  }
  function isMultiDay(ev) {
    return sod(ev.start.getTime()) !== sod(ev.end.getTime() - 1);
  }
  function isAllDay(ev) {
    if (ev.allDay) return true;
    const duration2 = ev.end.getTime() - ev.start.getTime();
    if (duration2 < DAY_MS) return false;
    const s = ev.start;
    return s.getHours() === 0 && s.getMinutes() === 0 && s.getSeconds() === 0;
  }
  function segmentForDay(ev, dayMs) {
    const dayStart = sod(dayMs);
    const dayEnd = dayStart + DAY_MS;
    const evStart = ev.start.getTime();
    const evEnd = ev.end.getTime();
    if (evStart >= dayEnd || evEnd <= dayStart) return null;
    const firstDayMs = sod(evStart);
    const lastDayMs = sod(evEnd - 1);
    const totalDays = Math.floor((lastDayMs - firstDayMs) / DAY_MS) + 1;
    const dayIndex = Math.floor((dayStart - firstDayMs) / DAY_MS) + 1;
    return {
      ev,
      start: new Date(Math.max(evStart, dayStart)),
      end: new Date(Math.min(evEnd, dayEnd)),
      isStart: dayStart === firstDayMs,
      isEnd: dayStart === lastDayMs,
      dayIndex,
      totalDays,
      allDay: isAllDay(ev)
    };
  }
  function createEventStore(adapter) {
    let eventMap = new SvelteMap();
    let loading = /* @__PURE__ */ state(false);
    let error = /* @__PURE__ */ state(null);
    const eventArray = /* @__PURE__ */ user_derived(() => [...eventMap.values()]);
    function overlaps(ev, start, end) {
      return ev.start < end && ev.end > start;
    }
    function removeEvent(id) {
      eventMap.delete(id);
    }
    function upsertEvent(ev) {
      eventMap.set(ev.id, ev);
    }
    return {
      get events() {
        return get(eventArray);
      },
      get loading() {
        return get(loading);
      },
      get error() {
        return get(error);
      },
      async load(range) {
        set(loading, true);
        set(error, null);
        try {
          const fetched = await adapter.fetchEvents(range);
          for (const ev of fetched) {
            upsertEvent(ev);
          }
        } catch (e) {
          set(error, e instanceof Error ? e.message : String(e), true);
        } finally {
          set(loading, false);
        }
      },
      forRange(start, end) {
        return get(eventArray).filter((ev) => overlaps(ev, start, end));
      },
      forDay(date) {
        const dayStart = new Date(sod(date.getTime()));
        const dayEnd = new Date(dayStart.getTime() + DAY_MS);
        return get(eventArray).filter((ev) => overlaps(ev, dayStart, dayEnd));
      },
      byId(id) {
        return eventMap.get(id);
      },
      async add(eventData) {
        if (!adapter.createEvent) throw new Error("Adapter is read-only: createEvent not implemented");
        set(loading, true);
        set(error, null);
        try {
          const created = await adapter.createEvent(eventData);
          upsertEvent(created);
          return created;
        } catch (e) {
          set(error, e instanceof Error ? e.message : String(e), true);
          throw e;
        } finally {
          set(loading, false);
        }
      },
      async update(id, patch) {
        if (!adapter.updateEvent) throw new Error("Adapter is read-only: updateEvent not implemented");
        set(loading, true);
        set(error, null);
        try {
          const updated = await adapter.updateEvent(id, patch);
          upsertEvent(updated);
        } catch (e) {
          set(error, e instanceof Error ? e.message : String(e), true);
          throw e;
        } finally {
          set(loading, false);
        }
      },
      async remove(id) {
        if (!adapter.deleteEvent) throw new Error("Adapter is read-only: deleteEvent not implemented");
        set(loading, true);
        set(error, null);
        try {
          await adapter.deleteEvent(id);
          removeEvent(id);
        } catch (e) {
          set(error, e instanceof Error ? e.message : String(e), true);
          throw e;
        } finally {
          set(loading, false);
        }
      },
      async move(id, newStart, newEnd) {
        const existing = eventMap.get(id);
        if (existing) {
          upsertEvent({ ...existing, start: newStart, end: newEnd });
        }
        try {
          await this.update(id, { start: newStart, end: newEnd });
        } catch (e) {
          if (existing) upsertEvent(existing);
          throw e;
        }
      }
    };
  }
  function inferMode(view) {
    if (view.startsWith("day")) return "day";
    return "week";
  }
  function computeRange(focus, mode, mondayStart, dayCount = 7) {
    if (mode === "day") {
      const start2 = new Date(focus);
      start2.setHours(0, 0, 0, 0);
      const end = new Date(start2.getTime() + DAY_MS);
      return { start: start2, end };
    }
    if (dayCount === 7) {
      const ws = startOfWeek(focus.getTime(), mondayStart);
      return { start: new Date(ws), end: new Date(addDaysMs(ws, 7)) };
    }
    const start = new Date(focus);
    start.setHours(0, 0, 0, 0);
    return { start, end: new Date(start.getTime() + dayCount * DAY_MS) };
  }
  function createViewState(options = {}) {
    let view = /* @__PURE__ */ state(proxy(options.view ?? "week-planner"));
    let focusDate = /* @__PURE__ */ state(proxy(options.initialDate ?? /* @__PURE__ */ new Date()));
    let mondayStart = /* @__PURE__ */ state(proxy(options.mondayStart ?? true));
    let dayCount = /* @__PURE__ */ state(proxy(options.dayCount ?? 7));
    const timezone = options.timezone;
    const modeResolver = options.modeForView;
    const mode = /* @__PURE__ */ user_derived(() => modeResolver?.(get(view)) ?? inferMode(get(view)));
    const range = /* @__PURE__ */ user_derived(() => computeRange(get(focusDate), get(mode), get(mondayStart), get(dayCount)));
    return {
      get view() {
        return get(view);
      },
      get focusDate() {
        return get(focusDate);
      },
      get range() {
        return get(range);
      },
      get mode() {
        return get(mode);
      },
      get mondayStart() {
        return get(mondayStart);
      },
      get timezone() {
        return timezone;
      },
      get dayCount() {
        return get(dayCount);
      },
      setView(id) {
        set(view, id, true);
      },
      setMondayStart(value) {
        set(mondayStart, value, true);
      },
      setFocusDate(date) {
        set(focusDate, date, true);
      },
      setDayCount(n) {
        set(dayCount, n, true);
      },
      next() {
        const days = get(mode) === "day" ? 1 : get(dayCount);
        set(focusDate, new Date(addDaysMs(get(focusDate).getTime(), days)), true);
      },
      prev() {
        const days = get(mode) === "day" ? -1 : -get(dayCount);
        set(focusDate, new Date(addDaysMs(get(focusDate).getTime(), days)), true);
      },
      goToday() {
        set(focusDate, /* @__PURE__ */ new Date(), true);
      }
    };
  }
  function createSelection() {
    let selectedId = /* @__PURE__ */ state(null);
    let hoveredId = /* @__PURE__ */ state(null);
    let selectedIds = /* @__PURE__ */ state(proxy(/* @__PURE__ */ new Set()));
    return {
      get selectedId() {
        return get(selectedId);
      },
      get hoveredId() {
        return get(hoveredId);
      },
      get selectedIds() {
        return get(selectedIds);
      },
      select(id) {
        set(selectedId, id, true);
        set(selectedIds, /* @__PURE__ */ new Set([id]), true);
      },
      deselect() {
        set(selectedId, null);
        set(selectedIds, /* @__PURE__ */ new Set(), true);
      },
      toggle(id) {
        const next2 = new Set(get(selectedIds));
        if (next2.has(id)) {
          next2.delete(id);
        } else {
          next2.add(id);
        }
        set(selectedIds, next2, true);
        set(selectedId, next2.size === 1 ? [...next2][0] : null, true);
      },
      clear() {
        set(selectedId, null);
        set(hoveredId, null);
        set(selectedIds, /* @__PURE__ */ new Set(), true);
      },
      hover(id) {
        set(hoveredId, id, true);
      },
      isSelected(id) {
        return get(selectedIds).has(id);
      }
    };
  }
  function createDragState() {
    let mode = /* @__PURE__ */ state("none");
    let payload = /* @__PURE__ */ state(null);
    const active = /* @__PURE__ */ user_derived(() => get(mode) !== "none");
    function reset2() {
      set(mode, "none");
      set(payload, null);
    }
    return {
      get mode() {
        return get(mode);
      },
      get payload() {
        return get(payload);
      },
      get active() {
        return get(active);
      },
      beginCreate(start, end, dayIndex = 0) {
        set(mode, "create");
        set(payload, { eventId: null, start, end, dayIndex }, true);
      },
      beginMove(eventId, start, end) {
        set(mode, "move");
        set(payload, { eventId, start, end, dayIndex: 0 }, true);
      },
      beginResize(eventId, edge, start, end) {
        set(mode, edge === "start" ? "resize-start" : "resize-end", true);
        set(payload, { eventId, start, end, dayIndex: 0 }, true);
      },
      updatePointer(start, end, dayIndex) {
        if (!get(payload)) return;
        set(
          payload,
          {
            ...get(payload),
            start,
            end,
            ...dayIndex !== void 0 ? { dayIndex } : {}
          },
          true
        );
      },
      commit() {
        const result = get(payload);
        reset2();
        return result;
      },
      cancel() {
        reset2();
      }
    };
  }
  const defaultLabels = {
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    day: "Day",
    week: "Week",
    planner: "Planner",
    agenda: "Agenda",
    now: "now",
    free: "free",
    allDay: "All day",
    done: "Done",
    upNext: "Up next",
    until: "until",
    noEvents: "No events",
    nothingScheduled: "Nothing scheduled",
    nothingScheduledYet: "Nothing scheduled yet",
    nothingWasScheduled: "Nothing was scheduled",
    allDoneForToday: "All done for today",
    goToToday: "Go to today",
    previousDay: "Previous day",
    nextDay: "Next day",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    calendar: "Calendar",
    viewMode: "View mode",
    dayNavigation: "Day navigation",
    weekNavigation: "Week navigation",
    dayPlanner: "Day planner",
    scrollableDayPlanner: "Scrollable day planner",
    todaysLineup: "Today's lineup",
    weekAhead: "Week ahead",
    multiWeekGrid: "Multi-week calendar grid",
    currentTime: "Current time",
    createEvent: "Create event",
    happeningNow: "happening now",
    past: "past",
    completed: "completed",
    inProgress: "in progress",
    nMore: (n) => `+${n} more`,
    nEvents: (n) => `${n} event${n === 1 ? "" : "s"}`,
    nCompleted: (n) => `${n} completed`,
    dayNOfTotal: (current, total) => `day ${current} of ${total}`,
    percentComplete: (pct) => `${pct}% complete`
  };
  let _labels = { ...defaultLabels };
  function getLabels() {
    return _labels;
  }
  let defaultLocale = "en-US";
  const hourCycleCache = /* @__PURE__ */ new Map();
  function is24HourLocale(locale) {
    const loc = locale ?? defaultLocale;
    if (hourCycleCache.has(loc)) return hourCycleCache.get(loc);
    const sample = new Intl.DateTimeFormat(loc, { hour: "numeric" }).resolvedOptions();
    const is24 = sample.hourCycle === "h23" || sample.hourCycle === "h24";
    hourCycleCache.set(loc, is24);
    return is24;
  }
  function fmtH(h, locale) {
    if (is24HourLocale(locale)) {
      return String(h);
    }
    if (h === 0) return "12a";
    if (h === 12) return "12p";
    return h < 12 ? h + "a" : h - 12 + "p";
  }
  function weekdayShort(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, { weekday: "short" });
  }
  function weekdayLong(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, { weekday: "long" });
  }
  function monthLong(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, { month: "long" });
  }
  function fmtTime$1(d, locale) {
    if (is24HourLocale(locale)) {
      const h2 = d.getHours();
      const m2 = d.getMinutes();
      return `${h2}:${String(m2).padStart(2, "0")}`;
    }
    const h = d.getHours();
    const m = d.getMinutes();
    const suffix = h >= 12 ? "p" : "a";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")}${suffix}`;
  }
  function fmtDuration(start, end) {
    const mins = Math.round((end.getTime() - start.getTime()) / 6e4);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const auto = ``;
  const neutral = `
	--dt-stage-bg: #ffffff;
	--dt-bg: #ffffff;
	--dt-surface: #f9fafb;
	--dt-border: rgba(0, 0, 0, 0.08);
	--dt-border-day: rgba(0, 0, 0, 0.14);
	--dt-text: rgba(0, 0, 0, 0.87);
	--dt-text-2: rgba(0, 0, 0, 0.54);
	--dt-text-3: rgba(0, 0, 0, 0.38);
	--dt-accent: #2563eb;
	--dt-accent-dim: rgba(37, 99, 235, 0.12);
	--dt-glow: rgba(37, 99, 235, 0.25);
	--dt-today-bg: rgba(37, 99, 235, 0.04);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(0, 0, 0, 0.1);
	--dt-success: rgba(22, 163, 74, 0.7);
	--dt-serif: inherit;
	--dt-sans: inherit;
	--dt-mono: ui-monospace, 'SFMono-Regular', monospace;
`;
  const midnight = `
	--dt-stage-bg: #080a0f;
	--dt-bg: #0b0e14;
	--dt-surface: #10141c;
	--dt-border: rgba(148, 163, 184, 0.07);
	--dt-border-day: rgba(148, 163, 184, 0.14);
	--dt-text: rgba(226, 232, 240, 0.85);
	--dt-text-2: rgba(148, 163, 184, 0.55);
	--dt-text-3: rgba(100, 116, 139, 0.55);
	--dt-accent: #ef4444;
	--dt-accent-dim: rgba(239, 68, 68, 0.18);
	--dt-glow: rgba(239, 68, 68, 0.35);
	--dt-today-bg: rgba(239, 68, 68, 0.02);
	--dt-btn-text: #fff;
	--dt-scrollbar: rgba(148, 163, 184, 0.12);
	--dt-success: rgba(74, 222, 128, 0.7);
	--dt-serif: Georgia, 'Times New Roman', serif;
`;
  const presets = { auto, neutral, midnight };
  function parseColor(raw) {
    if (!raw || raw === "transparent" || raw === "rgba(0, 0, 0, 0)") return null;
    const rgba2 = raw.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
    );
    if (rgba2) return [+rgba2[1], +rgba2[2], +rgba2[3]];
    if (raw.startsWith("#")) {
      const h = raw.replace("#", "");
      const n = h.length === 3 ? parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16) : parseInt(h, 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    return null;
  }
  function luminance([r, g, b]) {
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    h = (h % 1 + 1) % 1;
    const hue2rgb = (p2, q2, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
      if (t < 1 / 2) return q2;
      if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
      return p2;
    };
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
    ];
  }
  function rgbStr(r, g, b) {
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }
  function rgba(r, g, b, a) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function mix(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }
  const TEXT_VAR_CANDIDATES = [
    // Generic
    "--text",
    "--text-color",
    "--color-text",
    "--foreground",
    // Shadcn/ui
    "--color-foreground",
    // Bootstrap
    "--bs-body-color",
    // Chakra
    "--chakra-colors-text",
    "--chakra-colors-gray-800",
    // Material
    "--md-sys-color-on-background",
    "--mdc-theme-on-surface",
    // DaisyUI
    "--bc",
    // DaisyUI base-content
    // Radix
    "--gray-12",
    // Open Props
    "--text-1"
  ];
  function probeTextColor(el, bg) {
    const candidates = [];
    try {
      const rootCs = getComputedStyle(document.documentElement);
      for (const name of TEXT_VAR_CANDIDATES) {
        const val = rootCs.getPropertyValue(name).trim();
        if (val) {
          const rgb = parseColor(val);
          if (rgb) {
            candidates.push(rgb);
            break;
          }
        }
      }
    } catch {
    }
    let node = el;
    while (node) {
      const raw = node.style.color;
      if (raw) {
        const rgb = parseColor(raw);
        if (rgb) {
          candidates.push(rgb);
          break;
        }
      }
      node = node.parentElement;
    }
    node = el;
    while (node) {
      try {
        const raw = getComputedStyle(node).color;
        const rgb = parseColor(raw);
        if (rgb) {
          candidates.push(rgb);
          break;
        }
      } catch {
      }
      node = node.parentElement;
    }
    const bgLum = luminance(bg);
    for (const c of candidates) {
      const cLum = luminance(c);
      const ratio = (Math.max(bgLum, cLum) + 0.05) / (Math.min(bgLum, cLum) + 0.05);
      if (ratio >= 3) return c;
    }
    return null;
  }
  const ACCENT_VAR_CANDIDATES = [
    // Generic
    "--accent",
    "--accent-color",
    "--primary",
    "--primary-color",
    "--brand",
    "--brand-color",
    "--theme-color",
    "--color-primary",
    "--color-accent",
    // Tailwind / DaisyUI
    "--p",
    // DaisyUI primary
    "--color-primary",
    // Shadcn/ui
    "--primary",
    // MUI / Material
    "--md-sys-color-primary",
    "--mdc-theme-primary",
    // Bootstrap
    "--bs-primary",
    "--bs-primary-rgb",
    // Chakra
    "--chakra-colors-brand-500",
    "--chakra-colors-primary",
    // Open Props
    "--blue-6",
    // Radix
    "--accent-9",
    // Generic numbered
    "--color-primary-500",
    "--primary-500"
  ];
  function probeAccent(root2) {
    let cs;
    try {
      cs = getComputedStyle(root2);
    } catch {
      return null;
    }
    for (const name of ACCENT_VAR_CANDIDATES) {
      const val = cs.getPropertyValue(name).trim();
      if (val) {
        const rgb = parseColor(val);
        if (rgb) {
          const [, s] = rgbToHsl(...rgb);
          if (s > 0.15) return rgb;
        }
      }
    }
    const link2 = root2.querySelector("a[href]");
    if (link2) {
      const lc = parseColor(getComputedStyle(link2).color);
      if (lc) {
        const [, s] = rgbToHsl(...lc);
        if (s > 0.2) return lc;
      }
    }
    const accent = cs.getPropertyValue("accent-color").trim();
    if (accent && accent !== "auto") {
      const rgb = parseColor(accent);
      if (rgb) return rgb;
    }
    const btn = root2.querySelector('button:not([class*="cal-"])');
    if (btn) {
      const bg = parseColor(getComputedStyle(btn).backgroundColor);
      if (bg) {
        const [, s] = rgbToHsl(...bg);
        if (s > 0.25) return bg;
      }
    }
    return null;
  }
  const BG_VAR_CANDIDATES = [
    "--bg",
    "--background",
    "--color-bg",
    "--color-background",
    "--body-bg",
    "--bs-body-bg",
    // Bootstrap
    "--chakra-colors-bg",
    // Chakra
    "--md-sys-color-background",
    // Material
    "--b1",
    // DaisyUI base
    "--background",
    // Shadcn/ui
    "--color-background"
    // Radix / generic
  ];
  function probeBackground(el) {
    const result = (rgb) => ({ bg: rgb, isDark: luminance(rgb) < 0.4 });
    try {
      const rootCs = getComputedStyle(document.documentElement);
      for (const name of BG_VAR_CANDIDATES) {
        const val = rootCs.getPropertyValue(name).trim();
        if (val) {
          const rgb = parseColor(val);
          if (rgb) return result(rgb);
        }
      }
    } catch {
    }
    let node = el;
    while (node) {
      const raw = node.style.backgroundColor || node.style.background;
      if (raw) {
        const rgb = parseColor(raw);
        if (rgb) return result(rgb);
      }
      node = node.parentElement;
    }
    node = el;
    while (node) {
      try {
        const raw = getComputedStyle(node).backgroundColor;
        const rgb = parseColor(raw);
        if (rgb) return result(rgb);
      } catch {
      }
      node = node.parentElement;
    }
    if (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return { bg: [18, 18, 18], isDark: true };
    }
    return { bg: [255, 255, 255], isDark: false };
  }
  function probeHostTheme(el, options = {}) {
    const host = el.parentElement ?? el;
    const htmlRoot = (host.closest("body") ?? host) instanceof HTMLElement ? host.closest("body") ?? host : document.body;
    const { bg, isDark: autoDark } = probeBackground(host);
    const isDark = options.mode === "auto" || !options.mode ? autoDark : options.mode === "dark";
    let accent;
    if (options.accent) {
      accent = parseColor(options.accent) ?? [37, 99, 235];
    } else {
      accent = probeAccent(htmlRoot) ?? (isDark ? [239, 68, 68] : [37, 99, 235]);
    }
    const [aH, aS, aL] = rgbToHsl(...accent);
    const fonts = options.font ? { sans: options.font, mono: "ui-monospace, 'SFMono-Regular', monospace" } : { sans: "inherit", mono: "ui-monospace, 'SFMono-Regular', monospace" };
    const probedText = probeTextColor(host, bg);
    const textBase = probedText ?? (isDark ? [226, 232, 240] : [30, 30, 46]);
    const calBg = isDark ? mix(bg, [255, 255, 255], 0.02) : mix(bg, [0, 0, 0], 5e-3);
    const stageBg = bg;
    const surface = isDark ? mix(calBg, [255, 255, 255], 0.04) : mix(calBg, [0, 0, 0], 0.02);
    const borderAlpha = isDark ? 0.07 : 0.08;
    const borderDayAlpha = isDark ? 0.14 : 0.14;
    const borderRgb = isDark ? [148, 163, 184] : [0, 0, 0];
    const accentDim = isDark ? 0.15 : 0.12;
    const glow = isDark ? 0.3 : 0.25;
    const todayBg = isDark ? 0.03 : 0.04;
    const accentL = isDark ? Math.max(aL, 0.45) : Math.min(aL, 0.48);
    const accentAdj = hslToRgb(aH, Math.max(aS, 0.5), accentL);
    const accentLum = luminance(accentAdj);
    const btnText = accentLum < 0.4 ? "#ffffff" : "#1a1a2e";
    const scrollAlpha = isDark ? 0.12 : 0.1;
    const successRgb = isDark ? [74, 222, 128] : [22, 163, 74];
    const vars = [
      `--dt-stage-bg: ${rgbStr(...stageBg)}`,
      `--dt-bg: ${rgbStr(...calBg)}`,
      `--dt-surface: ${rgbStr(...surface)}`,
      `--dt-border: ${rgba(...borderRgb, borderAlpha)}`,
      `--dt-border-day: ${rgba(...borderRgb, borderDayAlpha)}`,
      `--dt-text: ${rgba(...textBase, isDark ? 0.87 : 0.87)}`,
      `--dt-text-2: ${rgba(...textBase, isDark ? 0.55 : 0.54)}`,
      `--dt-text-3: ${rgba(...textBase, isDark ? 0.38 : 0.38)}`,
      `--dt-accent: ${rgbStr(...accentAdj)}`,
      `--dt-accent-dim: ${rgba(...accentAdj, accentDim)}`,
      `--dt-glow: ${rgba(...accentAdj, glow)}`,
      `--dt-today-bg: ${rgba(...accentAdj, todayBg)}`,
      `--dt-btn-text: ${btnText}`,
      `--dt-scrollbar: ${rgba(...borderRgb, scrollAlpha)}`,
      `--dt-success: ${rgba(...successRgb, 0.7)}`,
      `--dt-sans: ${fonts.sans}`,
      `--dt-mono: ${fonts.mono}`
    ];
    return vars.map((v) => `	${v}`).join(";\n") + ";";
  }
  function observeHostTheme(el, callback, options = {}) {
    let last = "";
    const update = () => {
      const next2 = probeHostTheme(el, options);
      if (next2 !== last) {
        last = next2;
        callback(next2);
      }
    };
    const hasMQL = typeof window.matchMedia === "function";
    const mql = hasMQL ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const onScheme = () => update();
    mql?.addEventListener("change", onScheme);
    let rafId = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(update);
      });
    };
    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-mode", "color-scheme"]
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-mode", "color-scheme"]
    });
    update();
    return () => {
      cancelAnimationFrame(rafId);
      mql?.removeEventListener("change", onScheme);
      observer.disconnect();
    };
  }
  function useCalendarContext() {
    const raw = getContext("calendar");
    return {
      get viewState() {
        return raw?.viewState;
      },
      get drag() {
        return raw?.drag;
      },
      get commitDrag() {
        return raw?.commitDrag;
      },
      get snapInterval() {
        return raw?.snapInterval ?? 15;
      },
      get showNav() {
        return raw?.showNavigation ?? true;
      },
      get equalDays() {
        return raw?.equalDays ?? false;
      },
      get showDates() {
        return raw?.showDates ?? true;
      },
      get hideDays() {
        return raw?.hideDays;
      },
      get isMobile() {
        return raw?.mobile ?? false;
      },
      get autoHeight() {
        return raw?.autoHeight ?? false;
      },
      get compact() {
        return raw?.compact ?? false;
      },
      get readOnly() {
        return raw?.readOnly ?? false;
      },
      get blockedSlots() {
        return raw?.blockedSlots;
      },
      get dayHeaderSnippet() {
        return raw?.dayHeaderSnippet;
      },
      get minDuration() {
        return raw?.minDuration;
      },
      get maxDuration() {
        return raw?.maxDuration;
      },
      get oneventhover() {
        return raw?.oneventhover;
      },
      get disabledDates() {
        return raw?.disabledDates;
      },
      get disabledSet() {
        return new Set(raw?.disabledDates?.map((d) => sod(d.getTime())) ?? []);
      },
      get loadRange() {
        if (!raw) return void 0;
        return {
          get current() {
            return raw.loadRange;
          },
          set: (r) => raw.setLoadRange(r)
        };
      },
      get eventSnippet() {
        return raw?.eventSnippet;
      },
      get emptySnippet() {
        return raw?.emptySnippet;
      }
    };
  }
  function createClock() {
    let tick2 = /* @__PURE__ */ state(proxy(Date.now()));
    let today = /* @__PURE__ */ state(proxy(sod(Date.now())));
    let intervalId = null;
    function start() {
      intervalId = setInterval(
        () => {
          set(tick2, Date.now(), true);
          const sd = sod(get(tick2));
          if (sd !== get(today)) set(today, sd, true);
        },
        1e3
      );
    }
    function destroy() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
    onMount(() => {
      start();
      return destroy;
    });
    return {
      get tick() {
        return get(tick2);
      },
      get today() {
        return get(today);
      },
      get hm() {
        return fmtHM(get(tick2));
      },
      get s() {
        return fmtS(get(tick2));
      },
      get fractionalHour() {
        return fractionalHour(get(tick2));
      },
      destroy
    };
  }
  const DEFAULTS = {
    titleFont: "500 12px system-ui, sans-serif",
    secondaryFont: "400 10px system-ui, sans-serif",
    tagFont: "500 8px system-ui, sans-serif",
    titleLineHeight: 16,
    secondaryLineHeight: 13,
    contentGap: 3
  };
  function createTextMeasure(opts = {}) {
    const config = { ...DEFAULTS, ...opts };
    let pretext = null;
    let loadAttempted = false;
    let pretextAvailable = false;
    const cache = /* @__PURE__ */ new Map();
    function tryLoadPretext() {
      if (loadAttempted) return pretextAvailable;
      loadAttempted = true;
      try {
        const mod = globalThis.__pretextModule;
        if (mod) {
          pretext = mod;
          pretextAvailable = true;
        }
      } catch {
      }
      return pretextAvailable;
    }
    function getPrepared(text2, font) {
      const key = `${font}\0${text2}`;
      let prepared = cache.get(key);
      if (!prepared) {
        prepared = pretext.prepare(text2, font);
        cache.set(key, prepared);
      }
      return prepared;
    }
    function heuristicMeasure(text2, maxWidth, lineHeight, font) {
      const sizeMatch = font.match(/(\d+)px/);
      const fontSize = sizeMatch ? parseInt(sizeMatch[1]) : 12;
      const avgCharWidth = fontSize * 0.55;
      const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth));
      const lineCount = Math.max(1, Math.ceil(text2.length / charsPerLine));
      return { height: lineCount * lineHeight, lineCount };
    }
    function measureOne(text2, maxWidth, lineHeight, font) {
      if (!text2) return { height: 0, lineCount: 0 };
      if (pretextAvailable && pretext) {
        const prepared = getPrepared(text2, font);
        return pretext.layout(prepared, maxWidth, lineHeight);
      }
      return heuristicMeasure(text2, maxWidth, lineHeight, font);
    }
    return {
      get available() {
        tryLoadPretext();
        return pretextAvailable;
      },
      measure(text2, maxWidth, lineHeight) {
        tryLoadPretext();
        return measureOne(text2, maxWidth, lineHeight, config.titleFont);
      },
      fits(text2, maxWidth, lineHeight) {
        tryLoadPretext();
        const { lineCount } = measureOne(text2, maxWidth, lineHeight, config.titleFont);
        return lineCount <= 1;
      },
      measureStack(items, maxWidth, gap = config.contentGap) {
        tryLoadPretext();
        const breakdown = [];
        let totalHeight = 0;
        for (const item of items) {
          if (!item.text) {
            breakdown.push({ height: 0, lineCount: 0 });
            continue;
          }
          const font = item.font ?? config.secondaryFont;
          const lh = item.lineHeight ?? config.secondaryLineHeight;
          const result = measureOne(item.text, maxWidth, lh, font);
          breakdown.push(result);
          if (result.height > 0) {
            totalHeight += (totalHeight > 0 ? gap : 0) + result.height;
          }
        }
        return { height: totalHeight, breakdown };
      },
      fitContent(opts2) {
        tryLoadPretext();
        const { title, subtitle, location, time, tags, maxWidth, maxHeight } = opts2;
        const gap = config.contentGap;
        const titleResult = measureOne(title, maxWidth, config.titleLineHeight, config.titleFont);
        let used = titleResult.height;
        const result = {
          title: true,
          titleLines: titleResult.lineCount,
          subtitle: false,
          location: false,
          time: false,
          tags: false,
          totalHeight: used
        };
        if (time) {
          const h = measureOne(time, maxWidth, config.secondaryLineHeight, config.secondaryFont);
          if (used + gap + h.height <= maxHeight) {
            result.time = true;
            used += gap + h.height;
          }
        }
        if (subtitle) {
          const h = measureOne(subtitle, maxWidth, config.secondaryLineHeight, config.secondaryFont);
          if (used + gap + h.height <= maxHeight) {
            result.subtitle = true;
            used += gap + h.height;
          }
        }
        if (location) {
          const h = measureOne(location, maxWidth, config.secondaryLineHeight, config.secondaryFont);
          if (used + gap + h.height <= maxHeight) {
            result.location = true;
            used += gap + h.height;
          }
        }
        if (tags?.length) {
          const tagText = tags.join("  ");
          const h = measureOne(tagText, maxWidth, config.secondaryLineHeight, config.tagFont);
          if (used + gap + h.height <= maxHeight) {
            result.tags = true;
            used += gap + h.height;
          }
        }
        result.totalHeight = used;
        return result;
      },
      clear() {
        cache.clear();
        if (pretextAvailable && pretext) {
          pretext.clearCache();
        }
      }
    };
  }
  var root_3$5 = /* @__PURE__ */ from_html(`<div class="fs-tick svelte-mrwdy7"><span class="fs-tick-lb svelte-mrwdy7"> </span></div> <div class="fs-tick fs-tick--half svelte-mrwdy7"></div>`, 1);
  var root_8$5 = /* @__PURE__ */ from_html(`<span class="fs-blocked-label svelte-mrwdy7"> </span>`);
  var root_7$5 = /* @__PURE__ */ from_html(`<div class="fs-blocked svelte-mrwdy7"><!></div>`);
  var root_9$4 = /* @__PURE__ */ from_html(`<div class="fs-day-header-custom svelte-mrwdy7"><!></div>`);
  var root_2$6 = /* @__PURE__ */ from_html(`<div><!> <!> <!></div>`);
  var root_11$5 = /* @__PURE__ */ from_html(`<span class="fs-ev-live svelte-mrwdy7" aria-hidden="true"></span>`);
  var root_12$3 = /* @__PURE__ */ from_html(`<span class="fs-ev-next-badge svelte-mrwdy7" aria-hidden="true"> </span>`);
  var root_13$3 = /* @__PURE__ */ from_html(`<span class="fs-ev-time svelte-mrwdy7"> </span>`);
  var root_14$5 = /* @__PURE__ */ from_html(`<span class="fs-ev-sub svelte-mrwdy7"> </span>`);
  var root_15$4 = /* @__PURE__ */ from_html(`<span class="fs-ev-loc svelte-mrwdy7"> </span>`);
  var root_17$3 = /* @__PURE__ */ from_html(`<span class="fs-ev-tag svelte-mrwdy7"> </span>`);
  var root_16$4 = /* @__PURE__ */ from_html(`<span class="fs-ev-tags svelte-mrwdy7"></span>`);
  var root_10$4 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><div class="fs-ev-inner svelte-mrwdy7"><!> <!> <span class="fs-ev-title svelte-mrwdy7"> </span> <!> <!> <!></div></div>`);
  var root_20$3 = /* @__PURE__ */ from_html(`<span class="fs-ad-span svelte-mrwdy7"> </span>`);
  var root_21$3 = /* @__PURE__ */ from_html(`<span class="fs-ad-span svelte-mrwdy7"> </span>`);
  var root_19$3 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="fs-ad-dot svelte-mrwdy7" aria-hidden="true"></span> <span class="fs-ad-title svelte-mrwdy7"> </span> <!></div>`);
  var root_18$3 = /* @__PURE__ */ from_html(`<div class="fs-allday svelte-mrwdy7"></div>`);
  var root_22$3 = /* @__PURE__ */ from_html(`<nav class="fs-nav svelte-mrwdy7"><button> </button> <button class="fs-nav-pill svelte-mrwdy7"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M10 3 5 8l5 5"></path></svg></button> <button class="fs-nav-pill svelte-mrwdy7"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M6 3l5 5-5 5"></path></svg></button></nav>`);
  var root_1$5 = /* @__PURE__ */ from_html(`<div role="region"><div role="application"><div class="fs-track svelte-mrwdy7" role="none"><!> <div class="fs-now svelte-mrwdy7"><span class="fs-now-tag svelte-mrwdy7"> <span class="fs-now-sec svelte-mrwdy7"> </span></span> <div class="fs-now-line svelte-mrwdy7"></div></div> <!></div></div> <!> <div class="fs-date-label svelte-mrwdy7"> </div> <!></div>`);
  function PlannerDay($$anchor, $$props) {
    push($$props, true);
    const L = /* @__PURE__ */ user_derived(getLabels);
    let height = prop($$props, "height", 3, 520), events = prop($$props, "events", 19, () => []), style = prop($$props, "style", 3, ""), selectedEventId = prop($$props, "selectedEventId", 3, null), readOnly = prop($$props, "readOnly", 3, false);
    const ctx = useCalendarContext();
    const clock = createClock();
    const drag = /* @__PURE__ */ user_derived(() => ctx.drag);
    const commitDragCtx = /* @__PURE__ */ user_derived(() => ctx.commitDrag);
    const viewState = /* @__PURE__ */ user_derived(() => ctx.viewState);
    const loadRangeCtx = /* @__PURE__ */ user_derived(() => ctx.loadRange);
    const showNav = /* @__PURE__ */ user_derived(() => ctx.showNav);
    const showDates = /* @__PURE__ */ user_derived(() => ctx.showDates);
    const blockedSlots = /* @__PURE__ */ user_derived(() => ctx.blockedSlots);
    const dayHeaderSnippet = /* @__PURE__ */ user_derived(() => ctx.dayHeaderSnippet);
    const minDuration = /* @__PURE__ */ user_derived(() => ctx.minDuration);
    const autoHeight = /* @__PURE__ */ user_derived(() => ctx.autoHeight);
    const oneventhover = /* @__PURE__ */ user_derived(() => ctx.oneventhover);
    const disabledSet = /* @__PURE__ */ user_derived(() => ctx.disabledSet);
    const SNAP_MS = /* @__PURE__ */ user_derived(() => ctx.snapInterval * 6e4);
    let following = /* @__PURE__ */ state(true);
    let scrollDragging = /* @__PURE__ */ state(false);
    let wasDragging = false;
    let el;
    let containerW = /* @__PURE__ */ state(0);
    let containerH = /* @__PURE__ */ state(520);
    let dragStartX = 0;
    let dragScrollStart = 0;
    let rafId = 0;
    const BUFFER_DAYS = 7;
    const EDGE_DAYS = 2;
    const SHIFT_DAYS = 5;
    const _initMs = untrack(() => sod($$props.focusDate?.getTime() ?? Date.now()));
    let internalCenterMs = /* @__PURE__ */ state(proxy(_initMs));
    let lastExternalMs = _initMs;
    let rebasing = false;
    let visibleDayMs = /* @__PURE__ */ state(proxy(_initMs));
    const startHour = /* @__PURE__ */ user_derived(() => $$props.visibleHours?.[0] ?? 0);
    const endHour = /* @__PURE__ */ user_derived(() => $$props.visibleHours?.[1] ?? 24);
    const hourCount = /* @__PURE__ */ user_derived(() => Math.max(1, get(endHour) - get(startHour)));
    const DAY_GAP = 2;
    const dateLabel = /* @__PURE__ */ user_derived(() => get(showDates) ? new Date(get(visibleDayMs)).toLocaleDateString($$props.locale ?? "en-US", { weekday: "long", month: "long", day: "numeric" }) : new Date(get(visibleDayMs)).toLocaleDateString($$props.locale ?? "en-US", { weekday: "long" }));
    const count = 1 + 2 * BUFFER_DAYS;
    const origin = /* @__PURE__ */ user_derived(() => get(internalCenterMs) - BUFFER_DAYS * DAY_MS);
    user_effect(() => {
      if (!get(loadRangeCtx)) return;
      const rangeStart = new Date(get(internalCenterMs) - BUFFER_DAYS * DAY_MS);
      const rangeEnd = new Date(get(internalCenterMs) + (BUFFER_DAYS + 1) * DAY_MS);
      get(loadRangeCtx).set({ start: rangeStart, end: rangeEnd });
      return () => get(loadRangeCtx).set(null);
    });
    const MIN_HOUR_W = 60;
    const hourWidth = /* @__PURE__ */ user_derived(() => get(containerW) > 0 ? Math.max(MIN_HOUR_W, get(containerW) / get(hourCount)) : 110);
    const dayWidth = /* @__PURE__ */ user_derived(() => get(hourCount) * get(hourWidth));
    const totalWidth = /* @__PURE__ */ user_derived(() => count * (get(dayWidth) + DAY_GAP));
    const days = /* @__PURE__ */ user_derived(() => {
      const result = [];
      for (let i = 0; i < count; i++) {
        const ms = get(origin) + i * DAY_MS;
        result.push({
          ms,
          today: ms === clock.today,
          past: ms < clock.today,
          x: i * (get(dayWidth) + DAY_GAP)
        });
      }
      return result;
    });
    function timeToPx(ms) {
      const elapsed = ms - get(origin);
      const dayIndex = Math.floor(elapsed / DAY_MS);
      const hourInDay = (elapsed - dayIndex * DAY_MS) / HOUR_MS;
      const hourOffset = hourInDay - get(startHour);
      return dayIndex * (get(dayWidth) + DAY_GAP) + hourOffset * get(hourWidth);
    }
    function pxToTime(px) {
      const dayStride = get(dayWidth) + DAY_GAP;
      const dayIndex = Math.max(0, Math.min(count - 1, Math.floor(px / dayStride)));
      const localPx = px - dayIndex * dayStride;
      const hour = get(startHour) + localPx / get(hourWidth);
      return get(origin) + dayIndex * DAY_MS + hour * HOUR_MS;
    }
    const nowPx = /* @__PURE__ */ user_derived(() => timeToPx(clock.tick));
    const timedEvents = /* @__PURE__ */ user_derived(() => events().filter((ev) => !isAllDay(ev) && !isMultiDay(ev)));
    const allDayEvents = /* @__PURE__ */ user_derived(() => {
      const segs = [];
      for (const ev of events()) {
        if (!isAllDay(ev) && !isMultiDay(ev)) continue;
        const seg = segmentForDay(ev, get(visibleDayMs));
        if (seg) segs.push(seg);
      }
      return segs;
    });
    const CONTENT_TOP = 56;
    const ALLDAY_H = 24;
    const contentTop = /* @__PURE__ */ user_derived(() => CONTENT_TOP + (get(allDayEvents).length > 0 ? ALLDAY_H + 4 : 0));
    const EVENT_GAP = 5;
    const MIN_EVENT_H = 32;
    const measure = createTextMeasure({
      titleFont: "600 13px system-ui, sans-serif",
      secondaryFont: "400 10px system-ui, sans-serif",
      tagFont: "500 8px system-ui, sans-serif",
      titleLineHeight: 16,
      secondaryLineHeight: 13,
      contentGap: 6
    });
    const positionedEvents = /* @__PURE__ */ user_derived(() => {
      const now = clock.tick;
      const dragP = get(drag)?.active && get(drag).mode === "move" ? get(drag).payload : null;
      const staticEvents = [];
      let draggedEv = null;
      for (const ev of get(timedEvents)) {
        if (dragP?.eventId === ev.id) draggedEv = ev;
        else staticEvents.push(ev);
      }
      const sorted = [...staticEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
      const todayStart = sod(now);
      const todayEnd = todayStart + DAY_MS;
      let nextEventId = null;
      for (const ev of sorted) {
        const s = ev.start.getTime();
        const e = ev.end.getTime();
        if (s >= todayStart && s < todayEnd && s > now && !(s <= now && e > now)) {
          nextEventId = ev.id;
          break;
        }
      }
      const infos = sorted.map((ev) => {
        const s = ev.start.getTime();
        const e = ev.end.getTime();
        const x = timeToPx(s);
        const xEnd = timeToPx(e);
        return {
          ev,
          x,
          width: Math.max(xEnd - x, 28),
          row: 0,
          groupMaxRow: 1,
          isCurrent: s <= now && e > now,
          isNext: ev.id === nextEventId,
          isDragged: false,
          startMs: s,
          endMs: e
        };
      });
      const par = infos.map((_, i) => i);
      function find(i) {
        while (par[i] !== i) {
          par[i] = par[par[i]];
          i = par[i];
        }
        return i;
      }
      for (let i = 0; i < infos.length; i++) {
        for (let j = i + 1; j < infos.length; j++) {
          if (infos[j].startMs < infos[i].endMs) par[find(i)] = find(j);
          else break;
        }
      }
      const groups = /* @__PURE__ */ new Map();
      for (let i = 0; i < infos.length; i++) {
        const root2 = find(i);
        if (!groups.has(root2)) groups.set(root2, []);
        groups.get(root2).push(i);
      }
      for (const [, indices] of groups) {
        const rows = [];
        for (const idx of indices) {
          const inf = infos[idx];
          let row = 0;
          for (let r = 0; r < rows.length; r++) {
            if (rows[r] <= inf.startMs) {
              row = r;
              rows[r] = inf.endMs;
              break;
            }
            row = r + 1;
          }
          if (row >= rows.length) rows.push(inf.endMs);
          infos[idx].row = row;
        }
        for (const idx of indices) infos[idx].groupMaxRow = rows.length;
      }
      const availH = get(containerH) - get(contentTop) - 8;
      const result = infos.map(({ startMs: _s, endMs: _e, ...info }) => {
        const laneH = Math.max(MIN_EVENT_H, availH / info.groupMaxRow - EVENT_GAP);
        const topPx = get(contentTop) + info.row * (availH / info.groupMaxRow);
        const fit = measure.fitContent({
          title: info.ev.title,
          subtitle: info.ev.subtitle,
          location: info.ev.location,
          time: `${fmtTime$1(info.ev.start, $$props.locale)} – ${fmtTime$1(info.ev.end, $$props.locale)}`,
          tags: info.ev.tags,
          maxWidth: laneH - 16,
          maxHeight: info.width - 16
        });
        return { ...info, topPx, heightPx: laneH, isNext: info.isNext, fit };
      });
      if (draggedEv && dragP) {
        const x = timeToPx(dragP.start.getTime());
        const xEnd = timeToPx(dragP.end.getTime());
        const dragH = Math.max(MIN_EVENT_H, availH - EVENT_GAP);
        const dragW = Math.max(xEnd - x, 28);
        result.push({
          ev: draggedEv,
          x,
          width: dragW,
          row: 0,
          groupMaxRow: 1,
          topPx: get(contentTop),
          heightPx: dragH,
          isCurrent: draggedEv.start.getTime() <= now && draggedEv.end.getTime() > now,
          isNext: false,
          isDragged: true,
          fit: measure.fitContent({
            title: draggedEv.title,
            subtitle: draggedEv.subtitle,
            location: draggedEv.location,
            tags: draggedEv.tags,
            maxWidth: dragH - 16,
            maxHeight: dragW - 16
          })
        });
      }
      return result;
    });
    user_effect(() => {
      const ext = $$props.focusDate ? sod($$props.focusDate.getTime()) : clock.today;
      if (ext !== lastExternalMs && !rebasing) {
        lastExternalMs = ext;
        set(internalCenterMs, ext, true);
        set(visibleDayMs, ext, true);
        set(following, false);
        tick().then(() => {
          if (el) {
            const focusX = BUFFER_DAYS * (get(dayWidth) + DAY_GAP);
            el.scrollLeft = focusX + get(dayWidth) / 2 - el.clientWidth / 2;
          }
        });
      }
    });
    function checkEdges() {
      if (!el || !get(viewState) || rebasing) return;
      const stride = get(dayWidth) + DAY_GAP;
      const threshold = stride * EDGE_DAYS;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft < threshold) {
        rebase(-1);
      } else if (maxScroll > 0 && maxScroll - el.scrollLeft < threshold) {
        rebase(1);
      }
    }
    function rebase(direction) {
      if (rebasing) return;
      rebasing = true;
      const shift = SHIFT_DAYS * direction;
      const stride = get(dayWidth) + DAY_GAP;
      const adj = -shift * stride;
      if (el) el.scrollLeft += adj;
      dragScrollStart += adj;
      set(internalCenterMs, get(internalCenterMs) + shift * DAY_MS);
      lastExternalMs = get(internalCenterMs);
      get(viewState)?.setFocusDate(new Date(get(internalCenterMs)));
      tick().then(() => {
        rebasing = false;
      });
    }
    function syncFocusFromScroll() {
      if (!el || !get(viewState) || get(following) || rebasing) return;
      const centerX = el.scrollLeft + el.clientWidth / 2;
      const centerDayMs = sod(pxToTime(centerX));
      set(visibleDayMs, centerDayMs, true);
      if (centerDayMs !== lastExternalMs) {
        lastExternalMs = centerDayMs;
        get(viewState).setFocusDate(new Date(centerDayMs));
      }
    }
    onMount(() => {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          set(containerW, entry.contentRect.width, true);
          set(containerH, entry.contentRect.height, true);
        }
      });
      ro.observe(el);
      function frame() {
        if (get(following) && el && !get(scrollDragging)) {
          if (get(internalCenterMs) !== clock.today) {
            set(internalCenterMs, clock.today, true);
            lastExternalMs = clock.today;
            get(viewState)?.goToday();
          }
          set(visibleDayMs, clock.today, true);
          const todayD = get(days).find((d) => d.today);
          if (todayD) {
            el.scrollLeft = todayD.x + get(dayWidth) / 2 - el.clientWidth / 2;
          }
        } else if (el && !rebasing) {
          checkEdges();
          syncFocusFromScroll();
        }
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
      return () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
      };
    });
    const SCROLL_THRESHOLD = 3;
    function onPointerDown(e) {
      if (e.button !== 0) return;
      if (!readOnly()) return;
      if (e.target.closest(".fs-event")) return;
      dragStartX = e.clientX;
      dragScrollStart = el.scrollLeft;
      window.addEventListener("pointermove", onScrollMove);
      window.addEventListener("pointerup", onScrollUp, { once: true });
      window.addEventListener("pointercancel", onScrollUp, { once: true });
    }
    function onScrollMove(e) {
      const dx = e.clientX - dragStartX;
      if (!get(scrollDragging) && Math.abs(dx) >= SCROLL_THRESHOLD) {
        set(scrollDragging, true);
        wasDragging = true;
        set(following, false);
      }
      if (get(scrollDragging)) el.scrollLeft = dragScrollStart - dx;
    }
    function onScrollUp() {
      window.removeEventListener("pointermove", onScrollMove);
      window.removeEventListener("pointerup", onScrollUp);
      window.removeEventListener("pointercancel", onScrollUp);
      set(scrollDragging, false);
    }
    function isBlockedAt(dayMs, hour) {
      if (!get(blockedSlots)?.length) return false;
      const jsDay = new Date(dayMs).getDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      return get(blockedSlots).some((slot) => {
        if (slot.day && slot.day !== isoDay) return false;
        return hour >= slot.start && hour < slot.end;
      });
    }
    function handleTrackClick(e) {
      if (wasDragging) {
        wasDragging = false;
        return;
      }
      if (!$$props.oneventcreate || readOnly()) return;
      if (e.target.closest(".fs-event")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + el.scrollLeft;
      for (const d of get(days)) {
        if (clickX >= d.x && clickX < d.x + get(dayWidth)) {
          if (get(disabledSet).has(d.ms)) return;
          const frac = (clickX - d.x) / get(dayWidth);
          const clickHour = get(startHour) + frac * get(hourCount);
          if (isBlockedAt(d.ms, clickHour)) return;
          const hour = Math.floor(clickHour);
          const durMin = get(minDuration) ? Math.max(60, get(minDuration)) : 60;
          const start = new Date(d.ms + hour * HOUR_MS);
          const end = new Date(start.getTime() + durMin * 6e4);
          $$props.oneventcreate({ start, end });
          return;
        }
      }
    }
    const DRAG_THRESHOLD = 5;
    let evDragStartX = 0;
    let evDragOriginPx = 0;
    let evDragStarted = false;
    let evDragging = /* @__PURE__ */ state(false);
    let evDragId = /* @__PURE__ */ state(null);
    let evDragEvent = null;
    function onEventPointerDown(e, ev) {
      if (e.button !== 0 || !get(drag) || readOnly() || ev.data?.readOnly) return;
      e.stopPropagation();
      evDragStartX = e.clientX;
      evDragOriginPx = timeToPx(ev.start.getTime());
      evDragStarted = false;
      set(evDragId, ev.id, true);
      evDragEvent = ev;
      window.addEventListener("pointermove", onEvMove);
      window.addEventListener("pointerup", onEvUp, { once: true });
      window.addEventListener("pointercancel", onEvCancel, { once: true });
    }
    function onEvMove(e) {
      const ev = evDragEvent;
      if (!get(drag) || !ev || get(evDragId) !== ev.id) return;
      const dx = e.clientX - evDragStartX;
      if (!evDragStarted && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!evDragStarted) {
        evDragStarted = true;
        set(evDragging, true);
        get(drag).beginMove(ev.id, ev.start, ev.end);
      }
      const duration2 = ev.end.getTime() - ev.start.getTime();
      const raw = pxToTime(evDragOriginPx + dx);
      const snapped = Math.round(raw / get(SNAP_MS)) * get(SNAP_MS);
      get(drag).updatePointer(new Date(snapped), new Date(snapped + duration2));
    }
    function cleanupEvDrag() {
      window.removeEventListener("pointermove", onEvMove);
      window.removeEventListener("pointerup", onEvUp);
      window.removeEventListener("pointercancel", onEvCancel);
      evDragStarted = false;
      set(evDragging, false);
      set(evDragId, null);
      evDragEvent = null;
    }
    function onEvUp() {
      if (!get(drag)) {
        cleanupEvDrag();
        return;
      }
      if (!evDragStarted && evDragEvent) $$props.oneventclick?.(evDragEvent);
      else if (evDragStarted) get(commitDragCtx)?.();
      cleanupEvDrag();
    }
    function onEvCancel() {
      if (get(drag) && evDragStarted) get(drag).cancel();
      cleanupEvDrag();
    }
    var div = root_1$5();
    let classes;
    let styles;
    var div_1 = child(div);
    let classes_1;
    var div_2 = child(div_1);
    let styles_1;
    var node = child(div_2);
    each(node, 17, () => get(days), (d) => d.ms, ($$anchor2, d) => {
      var div_3 = root_2$6();
      let classes_2;
      let styles_2;
      var node_1 = child(div_3);
      each(node_1, 17, () => ({ length: get(hourCount) }), index, ($$anchor3, _, h) => {
        const hour = /* @__PURE__ */ user_derived(() => get(startHour) + h);
        const x = /* @__PURE__ */ user_derived(() => h * get(hourWidth));
        var fragment = root_3$5();
        var div_4 = first_child(fragment);
        let styles_3;
        var span = child(div_4);
        var text2 = child(span, true);
        reset(span);
        reset(div_4);
        var div_5 = sibling(div_4, 2);
        let styles_4;
        template_effect(
          ($0) => {
            styles_3 = set_style(div_4, "", styles_3, { left: `${get(x) ?? ""}px` });
            set_text(text2, $0);
            styles_4 = set_style(div_5, "", styles_4, { left: `${get(x) + get(hourWidth) * 0.5}px` });
          },
          [() => fmtH(get(hour), $$props.locale)]
        );
        append($$anchor3, fragment);
      });
      var node_2 = sibling(node_1, 2);
      {
        var consequent_3 = ($$anchor3) => {
          const jsDay = /* @__PURE__ */ user_derived(() => new Date(get(d).ms).getDay());
          const isoDay = /* @__PURE__ */ user_derived(() => get(jsDay) === 0 ? 7 : get(jsDay));
          var fragment_1 = comment();
          var node_3 = first_child(fragment_1);
          each(node_3, 17, () => get(blockedSlots), index, ($$anchor4, slot) => {
            var fragment_2 = comment();
            var node_4 = first_child(fragment_2);
            {
              var consequent_2 = ($$anchor5) => {
                const s = /* @__PURE__ */ user_derived(() => Math.max(get(slot).start, get(startHour)));
                const e = /* @__PURE__ */ user_derived(() => Math.min(get(slot).end, get(endHour)));
                var fragment_3 = comment();
                var node_5 = first_child(fragment_3);
                {
                  var consequent_1 = ($$anchor6) => {
                    var div_6 = root_7$5();
                    let styles_5;
                    var node_6 = child(div_6);
                    {
                      var consequent = ($$anchor7) => {
                        var span_1 = root_8$5();
                        var text_1 = child(span_1, true);
                        reset(span_1);
                        template_effect(() => set_text(text_1, get(slot).label));
                        append($$anchor7, span_1);
                      };
                      if_block(node_6, ($$render) => {
                        if (get(slot).label) $$render(consequent);
                      });
                    }
                    reset(div_6);
                    template_effect(() => {
                      set_attribute(div_6, "aria-label", get(slot).label || "Unavailable");
                      styles_5 = set_style(div_6, "", styles_5, {
                        left: `${(get(s) - get(startHour)) * get(hourWidth)}px`,
                        width: `${(get(e) - get(s)) * get(hourWidth)}px`
                      });
                    });
                    append($$anchor6, div_6);
                  };
                  if_block(node_5, ($$render) => {
                    if (get(e) > get(s)) $$render(consequent_1);
                  });
                }
                append($$anchor5, fragment_3);
              };
              if_block(node_4, ($$render) => {
                if (!get(slot).day || get(slot).day === get(isoDay)) $$render(consequent_2);
              });
            }
            append($$anchor4, fragment_2);
          });
          append($$anchor3, fragment_1);
        };
        if_block(node_2, ($$render) => {
          if (get(blockedSlots)?.length) $$render(consequent_3);
        });
      }
      var node_7 = sibling(node_2, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var div_7 = root_9$4();
          var node_8 = child(div_7);
          {
            let $0 = /* @__PURE__ */ user_derived(() => ({
              date: new Date(get(d).ms),
              isToday: get(d).today,
              dayName: weekdayShort(get(d).ms, $$props.locale)
            }));
            snippet(node_8, () => get(dayHeaderSnippet), () => get($0));
          }
          reset(div_7);
          append($$anchor3, div_7);
        };
        if_block(node_7, ($$render) => {
          if (get(dayHeaderSnippet)) $$render(consequent_4);
        });
      }
      reset(div_3);
      template_effect(
        ($0) => {
          classes_2 = set_class(div_3, 1, "fs-day svelte-mrwdy7", null, classes_2, $0);
          styles_2 = set_style(div_3, "", styles_2, {
            left: `${get(d).x ?? ""}px`,
            width: `${get(dayWidth) ?? ""}px`
          });
        },
        [
          () => ({
            "fs-today": get(d).today,
            "fs-past": get(d).past,
            "fs-disabled": get(disabledSet).has(get(d).ms)
          })
        ]
      );
      append($$anchor2, div_3);
    });
    var div_8 = sibling(node, 2);
    let styles_6;
    var span_2 = child(div_8);
    var text_2 = child(span_2, true);
    var span_3 = sibling(text_2);
    var text_3 = child(span_3, true);
    reset(span_3);
    reset(span_2);
    next(2);
    reset(div_8);
    var node_9 = sibling(div_8, 2);
    each(node_9, 17, () => get(positionedEvents), (p) => p.ev.id, ($$anchor2, p) => {
      var div_9 = root_10$4();
      let classes_3;
      let styles_7;
      var div_10 = child(div_9);
      var node_10 = child(div_10);
      {
        var consequent_5 = ($$anchor3) => {
          var span_4 = root_11$5();
          append($$anchor3, span_4);
        };
        var consequent_6 = ($$anchor3) => {
          var span_5 = root_12$3();
          var text_4 = child(span_5, true);
          reset(span_5);
          template_effect(() => set_text(text_4, get(L).upNext));
          append($$anchor3, span_5);
        };
        if_block(node_10, ($$render) => {
          if (get(p).isCurrent) $$render(consequent_5);
          else if (get(p).isNext) $$render(consequent_6, 1);
        });
      }
      var node_11 = sibling(node_10, 2);
      {
        var consequent_7 = ($$anchor3) => {
          var span_6 = root_13$3();
          var text_5 = child(span_6);
          reset(span_6);
          template_effect(($0, $1) => set_text(text_5, `${$0 ?? ""} – ${$1 ?? ""}`), [
            () => fmtTime$1(get(p).ev.start, $$props.locale),
            () => fmtTime$1(get(p).ev.end, $$props.locale)
          ]);
          append($$anchor3, span_6);
        };
        if_block(node_11, ($$render) => {
          if (get(p).fit.time) $$render(consequent_7);
        });
      }
      var span_7 = sibling(node_11, 2);
      var text_6 = child(span_7, true);
      reset(span_7);
      var node_12 = sibling(span_7, 2);
      {
        var consequent_8 = ($$anchor3) => {
          var span_8 = root_14$5();
          var text_7 = child(span_8, true);
          reset(span_8);
          template_effect(() => set_text(text_7, get(p).ev.subtitle));
          append($$anchor3, span_8);
        };
        if_block(node_12, ($$render) => {
          if (get(p).ev.subtitle && get(p).fit.subtitle) $$render(consequent_8);
        });
      }
      var node_13 = sibling(node_12, 2);
      {
        var consequent_9 = ($$anchor3) => {
          var span_9 = root_15$4();
          var text_8 = child(span_9, true);
          reset(span_9);
          template_effect(() => set_text(text_8, get(p).ev.location));
          append($$anchor3, span_9);
        };
        if_block(node_13, ($$render) => {
          if (get(p).ev.location && get(p).fit.location) $$render(consequent_9);
        });
      }
      var node_14 = sibling(node_13, 2);
      {
        var consequent_10 = ($$anchor3) => {
          var span_10 = root_16$4();
          each(span_10, 21, () => get(p).ev.tags, index, ($$anchor4, tag) => {
            var span_11 = root_17$3();
            var text_9 = child(span_11, true);
            reset(span_11);
            template_effect(() => set_text(text_9, get(tag)));
            append($$anchor4, span_11);
          });
          reset(span_10);
          append($$anchor3, span_10);
        };
        if_block(node_14, ($$render) => {
          if (get(p).ev.tags?.length && get(p).fit.tags) $$render(consequent_10);
        });
      }
      reset(div_10);
      reset(div_9);
      template_effect(() => {
        classes_3 = set_class(div_9, 1, "fs-event svelte-mrwdy7", null, classes_3, {
          "fs-event--selected": selectedEventId() === get(p).ev.id,
          "fs-event--current": get(p).isCurrent,
          "fs-event--next": get(p).isNext,
          "fs-event--dragging": get(p).isDragged,
          "fs-event--readonly": get(p).ev.data?.readOnly,
          "fs-event--cancelled": get(p).ev.status === "cancelled",
          "fs-event--tentative": get(p).ev.status === "tentative",
          "fs-event--full": get(p).ev.status === "full",
          "fs-event--limited": get(p).ev.status === "limited"
        });
        set_attribute(div_9, "aria-label", `${get(p).ev.title ?? ""}${get(p).ev.status === "cancelled" ? " (cancelled)" : ""}${get(p).ev.status === "tentative" ? " (tentative)" : ""}${get(p).ev.status === "full" ? " (full)" : ""}${get(p).ev.status === "limited" ? " (limited)" : ""}${get(p).isCurrent ? ` (${get(L).inProgress})` : ""}${get(p).isNext ? ` (${get(L).upNext})` : ""}`);
        styles_7 = set_style(div_9, "", styles_7, {
          left: `${get(p).x ?? ""}px`,
          width: `${get(p).width ?? ""}px`,
          top: `${get(p).topPx ?? ""}px`,
          height: `${get(p).heightPx ?? ""}px`,
          "--ev-color": get(p).ev.color ?? "var(--dt-accent)"
        });
        set_text(text_6, get(p).ev.title);
      });
      delegated("pointerdown", div_9, (e) => onEventPointerDown(e, get(p).ev));
      event("pointerenter", div_9, () => get(oneventhover)?.(get(p).ev));
      delegated("keydown", div_9, (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          $$props.oneventclick?.(get(p).ev);
        }
      });
      append($$anchor2, div_9);
    });
    reset(div_2);
    reset(div_1);
    bind_this(div_1, ($$value) => el = $$value, () => el);
    var node_15 = sibling(div_1, 2);
    {
      var consequent_12 = ($$anchor2) => {
        var div_11 = root_18$3();
        set_style(div_11, "", {}, { top: "56px" });
        each(div_11, 21, () => get(allDayEvents), (seg) => seg.ev.id, ($$anchor3, seg) => {
          var div_12 = root_19$3();
          let classes_4;
          let styles_8;
          var span_12 = sibling(child(div_12), 2);
          var text_10 = child(span_12, true);
          reset(span_12);
          var node_16 = sibling(span_12, 2);
          {
            var consequent_11 = ($$anchor4) => {
              var span_13 = root_20$3();
              var text_11 = child(span_13);
              reset(span_13);
              template_effect(() => set_text(text_11, `${get(L).day ?? ""} ${get(seg).dayIndex ?? ""}/${get(seg).totalDays ?? ""}`));
              append($$anchor4, span_13);
            };
            var alternate = ($$anchor4) => {
              var span_14 = root_21$3();
              var text_12 = child(span_14, true);
              reset(span_14);
              template_effect(() => set_text(text_12, get(L).allDay));
              append($$anchor4, span_14);
            };
            if_block(node_16, ($$render) => {
              if (get(seg).totalDays > 1) $$render(consequent_11);
              else $$render(alternate, -1);
            });
          }
          reset(div_12);
          template_effect(
            ($0) => {
              classes_4 = set_class(div_12, 1, "fs-ad svelte-mrwdy7", null, classes_4, {
                "fs-ad--start": get(seg).isStart,
                "fs-ad--selected": selectedEventId() === get(seg).ev.id
              });
              set_attribute(div_12, "aria-label", `${get(seg).ev.title ?? ""}${$0 ?? ""}`);
              styles_8 = set_style(div_12, "", styles_8, { "--ev-color": get(seg).ev.color ?? "var(--dt-accent)" });
              set_text(text_10, get(seg).ev.title);
            },
            [
              () => get(seg).totalDays > 1 ? `, ${get(L).dayNOfTotal(get(seg).dayIndex, get(seg).totalDays)}` : `, ${get(L).allDay}`
            ]
          );
          delegated("click", div_12, () => $$props.oneventclick?.(get(seg).ev));
          delegated("keydown", div_12, (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              $$props.oneventclick?.(get(seg).ev);
            }
          });
          append($$anchor3, div_12);
        });
        reset(div_11);
        append($$anchor2, div_11);
      };
      if_block(node_15, ($$render) => {
        if (get(allDayEvents).length > 0) $$render(consequent_12);
      });
    }
    var div_13 = sibling(node_15, 2);
    var text_13 = child(div_13, true);
    reset(div_13);
    var node_17 = sibling(div_13, 2);
    {
      var consequent_13 = ($$anchor2) => {
        var nav = root_22$3();
        var button = child(nav);
        let classes_5;
        var text_14 = child(button, true);
        reset(button);
        var button_1 = sibling(button, 2);
        var button_2 = sibling(button_1, 2);
        reset(nav);
        template_effect(() => {
          set_attribute(nav, "aria-label", get(L).dayNavigation);
          classes_5 = set_class(button, 1, "fs-nav-pill fs-nav-today svelte-mrwdy7", null, classes_5, { "fs-nav-today--hidden": get(following) });
          set_attribute(button, "aria-label", get(L).goToToday);
          set_attribute(button, "tabindex", get(following) ? -1 : 0);
          set_text(text_14, get(L).today);
          set_attribute(button_1, "aria-label", get(L).previousDay);
          set_attribute(button_2, "aria-label", get(L).nextDay);
        });
        delegated("click", button, () => {
          set(internalCenterMs, clock.today, true);
          lastExternalMs = clock.today;
          get(viewState)?.goToday();
          set(following, true);
        });
        delegated("click", button_1, () => {
          const prev = get(internalCenterMs) - DAY_MS;
          set(internalCenterMs, prev);
          lastExternalMs = prev;
          get(viewState)?.prev();
          set(following, false);
        });
        delegated("click", button_2, () => {
          const next2 = get(internalCenterMs) + DAY_MS;
          set(internalCenterMs, next2);
          lastExternalMs = next2;
          get(viewState)?.next();
          set(following, false);
        });
        append($$anchor2, nav);
      };
      if_block(node_17, ($$render) => {
        if (get(showNav)) $$render(consequent_13);
      });
    }
    reset(div);
    template_effect(() => {
      classes = set_class(div, 1, "fs svelte-mrwdy7", null, classes, { "fs--auto": get(autoHeight) });
      styles = set_style(div, style() || void 0, styles, {
        height: get(autoHeight) ? void 0 : height() ? `${height()}px` : "100%"
      });
      set_attribute(div, "aria-label", get(L).dayPlanner);
      classes_1 = set_class(div_1, 1, "fs-scroll svelte-mrwdy7", null, classes_1, {
        "fs-grabbing": get(scrollDragging),
        "fs-readonly": readOnly()
      });
      set_attribute(div_1, "aria-label", get(L).scrollableDayPlanner);
      styles_1 = set_style(div_2, "", styles_1, { width: `${get(totalWidth) ?? ""}px` });
      styles_6 = set_style(div_8, "", styles_6, { left: `${get(nowPx) ?? ""}px` });
      set_text(text_2, clock.hm);
      set_text(text_3, clock.s);
      set_text(text_13, get(dateLabel));
    });
    event("wheel", div_1, (e) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY || e.deltaX;
      set(following, false);
    });
    delegated("pointerdown", div_1, onPointerDown);
    delegated("click", div_2, handleTrackClick);
    append($$anchor, div);
    pop();
  }
  delegate(["pointerdown", "click", "keydown"]);
  const allDaySegmentContent = ($$anchor, seg = noop) => {
    var fragment = root_1$4();
    var node = first_child(fragment);
    {
      var consequent = ($$anchor2) => {
        var span = root_2$5();
        var text2 = child(span, true);
        reset(span);
        template_effect(() => set_text(text2, seg().ev.title));
        append($$anchor2, span);
      };
      var alternate = ($$anchor2) => {
        var fragment_1 = root_3$4();
        var span_1 = sibling(first_child(fragment_1), 2);
        var text_1 = child(span_1, true);
        reset(span_1);
        template_effect(() => set_text(text_1, seg().ev.title));
        append($$anchor2, fragment_1);
      };
      if_block(node, ($$render) => {
        if (seg().isStart) $$render(consequent);
        else $$render(alternate, -1);
      });
    }
    var node_1 = sibling(node, 2);
    {
      var consequent_1 = ($$anchor2) => {
        var span_2 = root_4$4();
        append($$anchor2, span_2);
      };
      if_block(node_1, ($$render) => {
        if (!seg().isEnd && seg().totalDays > 1) $$render(consequent_1);
      });
    }
    append($$anchor, fragment);
  };
  var root_2$5 = /* @__PURE__ */ from_html(`<span class="wg-ad-title svelte-j4rvbp"> </span>`);
  var root_3$4 = /* @__PURE__ */ from_html(`<span class="wg-ad-cont svelte-j4rvbp" aria-hidden="true">◂</span> <span class="wg-ad-title svelte-j4rvbp"> </span>`, 1);
  var root_4$4 = /* @__PURE__ */ from_html(`<span class="wg-ad-arrow svelte-j4rvbp" aria-hidden="true">▸</span>`);
  var root_1$4 = /* @__PURE__ */ from_html(`<!> <!>`, 1);
  var root_6$5 = /* @__PURE__ */ from_html(`<span class="wg-ev-loc svelte-j4rvbp"> </span>`);
  var root_5$3 = /* @__PURE__ */ from_html(`<span class="wg-ev-time svelte-j4rvbp"> </span> <span class="wg-ev-title svelte-j4rvbp"> </span> <!>`, 1);
  var root_9$3 = /* @__PURE__ */ from_html(`<span> </span>`);
  var root_10$3 = /* @__PURE__ */ from_html(`<span class="wg-cell-month svelte-j4rvbp"> </span>`);
  var root_11$4 = /* @__PURE__ */ from_html(`<div class="wg-cell-custom-header svelte-j4rvbp"><!></div>`);
  var root_15$3 = /* @__PURE__ */ from_html(`<span class="wg-blocked-label svelte-j4rvbp"> </span>`);
  var root_14$4 = /* @__PURE__ */ from_html(`<div class="wg-blocked svelte-j4rvbp"><!></div>`);
  var root_17$2 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><!></div>`);
  var root_18$2 = /* @__PURE__ */ from_html(`<div aria-hidden="true"><!></div>`);
  var root_16$3 = /* @__PURE__ */ from_html(`<div class="wg-allday svelte-j4rvbp"><!> <!></div>`);
  var root_19$2 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><!></div>`);
  var root_20$2 = /* @__PURE__ */ from_html(`<div class="wg-ev wg-ev--drag-preview svelte-j4rvbp" aria-hidden="true"><!></div>`);
  var root_21$2 = /* @__PURE__ */ from_html(`<div class="wg-ev-more svelte-j4rvbp"> </div>`);
  var root_8$4 = /* @__PURE__ */ from_html(`<div role="gridcell" tabindex="0"><div><!> <span class="wg-day-wd svelte-j4rvbp"> </span></div> <!> <!> <!> <!> <div class="wg-cell-events svelte-j4rvbp"><!> <!> <!></div></div>`);
  var root_7$4 = /* @__PURE__ */ from_html(`<div><div class="wg-week-body svelte-j4rvbp"><div class="wg-days svelte-j4rvbp"></div></div></div>`);
  var root_22$2 = /* @__PURE__ */ from_html(`<nav class="wg-nav svelte-j4rvbp"><button class="wg-nav-pill svelte-j4rvbp"> </button></nav>`);
  var root$4 = /* @__PURE__ */ from_html(`<div><div class="wg-body svelte-j4rvbp" role="grid"></div> <!></div>`);
  function PlannerWeek($$anchor, $$props) {
    push($$props, true);
    const timedEventContent = ($$anchor2, ev = noop) => {
      var fragment_2 = root_5$3();
      var span_3 = first_child(fragment_2);
      var text_2 = child(span_3, true);
      reset(span_3);
      var span_4 = sibling(span_3, 2);
      var text_3 = child(span_4, true);
      reset(span_4);
      var node_2 = sibling(span_4, 2);
      {
        var consequent_2 = ($$anchor3) => {
          var span_5 = root_6$5();
          var text_4 = child(span_5, true);
          reset(span_5);
          template_effect(() => set_text(text_4, ev().location));
          append($$anchor3, span_5);
        };
        if_block(node_2, ($$render) => {
          if (ev().location) $$render(consequent_2);
        });
      }
      template_effect(
        ($0) => {
          set_text(text_2, $0);
          set_text(text_3, ev().title);
        },
        [() => fmtAmPm(ev().start)]
      );
      append($$anchor2, fragment_2);
    };
    const L = /* @__PURE__ */ user_derived(getLabels);
    let mondayStart = prop($$props, "mondayStart", 3, true), height = prop($$props, "height", 3, 520), events = prop($$props, "events", 19, () => []), style = prop($$props, "style", 3, ""), selectedEventId = prop($$props, "selectedEventId", 3, null), readOnly = prop($$props, "readOnly", 3, false);
    const ctx = useCalendarContext();
    const clock = createClock();
    const drag = /* @__PURE__ */ user_derived(() => ctx.drag);
    const commitDragCtx = /* @__PURE__ */ user_derived(() => ctx.commitDrag);
    const viewState = /* @__PURE__ */ user_derived(() => ctx.viewState);
    const loadRangeCtx = /* @__PURE__ */ user_derived(() => ctx.loadRange);
    const showNav = /* @__PURE__ */ user_derived(() => ctx.showNav);
    const equalDays = /* @__PURE__ */ user_derived(() => ctx.equalDays);
    const showDates = /* @__PURE__ */ user_derived(() => ctx.showDates);
    const hideDays = /* @__PURE__ */ user_derived(() => ctx.hideDays);
    const blockedSlots = /* @__PURE__ */ user_derived(() => ctx.blockedSlots);
    const dayHeaderSnippet = /* @__PURE__ */ user_derived(() => ctx.dayHeaderSnippet);
    const minDuration = /* @__PURE__ */ user_derived(() => ctx.minDuration);
    const autoHeight = /* @__PURE__ */ user_derived(() => ctx.autoHeight);
    const oneventhover = /* @__PURE__ */ user_derived(() => ctx.oneventhover);
    const disabledSet = /* @__PURE__ */ user_derived(() => ctx.disabledSet);
    const INITIAL_BUFFER = 52;
    const EXTEND_BY = 26;
    const EDGE_PX = 200;
    let bufferBefore = /* @__PURE__ */ state(INITIAL_BUFFER);
    let bufferAfter = /* @__PURE__ */ state(INITIAL_BUFFER);
    const MAX_EVENTS_SHOWN = 5;
    const _initMs = untrack(() => sod($$props.focusDate?.getTime() ?? Date.now()));
    let internalFocusMs = /* @__PURE__ */ state(proxy(_initMs));
    let lastExternalMs = _initMs;
    let el;
    let scrolled = /* @__PURE__ */ state(false);
    function scrollWeekIntoContainer(targetMs, behavior = "auto") {
      if (!el) return;
      let target = null;
      if (targetMs !== void 0) {
        const rows = el.querySelectorAll("[data-week]");
        for (const row of rows) {
          const weekMs = Number(row.dataset.week);
          if (weekMs <= targetMs && targetMs < weekMs + get(customDays) * DAY_MS) {
            target = row;
            break;
          }
        }
      }
      if (!target) target = el.querySelector(".wg-week--current");
      if (!target) return;
      const targetTop = target.offsetTop - (el.clientHeight - target.offsetHeight) / 2;
      el.scrollTo({ top: Math.max(0, targetTop), behavior });
    }
    const todayMs = /* @__PURE__ */ user_derived(() => clock.today);
    const customDays = /* @__PURE__ */ user_derived(() => get(viewState)?.dayCount ?? 7);
    const anchorPeriodStart = /* @__PURE__ */ user_derived(() => get(customDays) === 7 ? startOfWeek(get(internalFocusMs), mondayStart()) : sod(get(internalFocusMs)));
    user_effect(() => {
      if (!get(loadRangeCtx)) return;
      const rangeStart = new Date(get(anchorPeriodStart) - get(bufferBefore) * get(customDays) * DAY_MS);
      const rangeEnd = new Date(get(anchorPeriodStart) + (get(bufferAfter) + 1) * get(customDays) * DAY_MS);
      get(loadRangeCtx).set({ start: rangeStart, end: rangeEnd });
      return () => get(loadRangeCtx).set(null);
    });
    const weeks = /* @__PURE__ */ user_derived(() => {
      const result = [];
      for (let w = -get(bufferBefore); w <= get(bufferAfter); w++) {
        const periodStart = get(anchorPeriodStart) + w * get(customDays) * DAY_MS;
        const isCurrent = get(todayMs) >= periodStart && get(todayMs) < periodStart + get(customDays) * DAY_MS;
        const days = [];
        for (let d = 0; d < get(customDays); d++) {
          const ms = periodStart + d * DAY_MS;
          const date = new Date(ms);
          const dayNum2 = date.getDate();
          const dow = date.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const isToday = ms === get(todayMs);
          const isPast = get(equalDays) ? false : ms < get(todayMs);
          const isFirstOfMonth = dayNum2 === 1;
          const monthLabel2 = d === 0 || isFirstOfMonth ? monthLong(ms, $$props.locale).toUpperCase() : null;
          const dayEnd = ms + DAY_MS;
          const dayEventsAll = events().filter((ev) => ev.start.getTime() < dayEnd && ev.end.getTime() > ms).sort((a, b) => a.start.getTime() - b.start.getTime());
          const timedEvents = [];
          const allDaySegments = [];
          for (const ev of dayEventsAll) {
            if (isAllDay(ev) || isMultiDay(ev)) {
              const seg = segmentForDay(ev, ms);
              if (seg) allDaySegments.push(seg);
            } else {
              timedEvents.push(ev);
            }
          }
          days.push({
            ms,
            dayNum: dayNum2,
            isToday,
            isPast,
            isWeekend,
            isFirstOfMonth,
            monthLabel: monthLabel2,
            events: timedEvents,
            allDaySegments
          });
        }
        const startDate = new Date(periodStart);
        const showMonth = get(customDays) === 7 ? startDate.getDate() <= 7 : startDate.getDate() <= get(customDays);
        const monthLabel = showMonth ? monthLong(periodStart, $$props.locale).toUpperCase() : null;
        result.push({ weekStart: periodStart, isCurrent, monthLabel, days });
      }
      if (get(hideDays)?.length) {
        for (const row of result) {
          row.days = row.days.filter((d) => {
            const isoDay = new Date(d.ms).getDay();
            const iso = isoDay === 0 ? 7 : isoDay;
            return !get(hideDays).includes(iso);
          });
        }
      }
      return result;
    });
    function fmtAmPm(d) {
      return fmtTime$1(d, $$props.locale);
    }
    onMount(async () => {
      await tick();
      scrollWeekIntoContainer();
    });
    user_effect(() => {
      const ext = $$props.focusDate ? sod($$props.focusDate.getTime()) : clock.today;
      if (ext !== lastExternalMs) {
        lastExternalMs = ext;
        set(internalFocusMs, ext, true);
        tick().then(() => scrollWeekIntoContainer(ext, "smooth"));
      }
    });
    function isCurrentWeekVisible() {
      if (!el) return false;
      const current = el.querySelector(".wg-week--current");
      if (!current) return false;
      const top = current.offsetTop - el.scrollTop;
      const bottom = top + current.offsetHeight;
      return bottom > 0 && top < el.clientHeight;
    }
    let extending = false;
    function handleUserScroll() {
      set(scrolled, !isCurrentWeekVisible());
      if (!el || extending) return;
      if (el.scrollTop < EDGE_PX) {
        extending = true;
        const oldHeight = el.scrollHeight;
        set(bufferBefore, get(bufferBefore) + EXTEND_BY);
        tick().then(() => {
          el.scrollTop += el.scrollHeight - oldHeight;
          extending = false;
        });
      } else {
        const bottomRemaining = el.scrollHeight - el.clientHeight - el.scrollTop;
        if (bottomRemaining < EDGE_PX) {
          set(bufferAfter, get(bufferAfter) + EXTEND_BY);
        }
      }
    }
    function jumpToday() {
      set(internalFocusMs, clock.today, true);
      lastExternalMs = clock.today;
      get(viewState)?.goToday();
      set(scrolled, false);
      tick().then(() => {
        scrollWeekIntoContainer(clock.today, "smooth");
      });
    }
    function handleDayCellClick(ms, e) {
      const target = e.target;
      if (target.closest(".wg-ev")) return;
      if (readOnly() || !$$props.oneventcreate) return;
      if (get(disabledSet).has(ms)) return;
      const durMin = get(minDuration) ? Math.max(60, get(minDuration)) : 60;
      const start = new Date(ms + 9 * HOUR_MS);
      const end = new Date(start.getTime() + durMin * 6e4);
      $$props.oneventcreate({ start, end });
    }
    const DRAG_THRESHOLD = 8;
    let evDragStartX = 0;
    let evDragStartY = 0;
    let evDragStarted = false;
    let evDragging = /* @__PURE__ */ state(false);
    let evDragId = /* @__PURE__ */ state(null);
    let evDragEvent = null;
    const dragPreviewEvent = /* @__PURE__ */ user_derived(() => {
      const payload = get(drag)?.active && get(drag).mode === "move" ? get(drag).payload : null;
      if (!payload?.eventId) return null;
      const ev = events().find((event2) => event2.id === payload.eventId);
      if (!ev) return null;
      return { ...ev, start: payload.start, end: payload.end };
    });
    function isDraggedEvent(eventId) {
      return get(dragPreviewEvent)?.id === eventId;
    }
    function timedEventsForDay(day) {
      if (!get(dragPreviewEvent)) return day.events;
      return day.events.filter((ev) => ev.id !== get(dragPreviewEvent).id);
    }
    function dragPreviewTimedForDay(dayMs) {
      const ev = get(dragPreviewEvent);
      if (!ev || isAllDay(ev) || isMultiDay(ev)) return null;
      const dayEnd = dayMs + DAY_MS;
      return ev.start.getTime() < dayEnd && ev.end.getTime() > dayMs ? ev : null;
    }
    function dragPreviewSegmentForDay(dayMs) {
      const ev = get(dragPreviewEvent);
      if (!ev || !isAllDay(ev) && !isMultiDay(ev)) return null;
      return segmentForDay(ev, dayMs);
    }
    function getCellWidth() {
      const cell = el?.querySelector(".wg-cell");
      return cell ? cell.getBoundingClientRect().width : 100;
    }
    function getRowHeight() {
      const row = el?.querySelector(".wg-week");
      return row ? row.getBoundingClientRect().height + 24 : 200;
    }
    function onEventPointerDown(e, ev) {
      if (e.button !== 0 || !get(drag) || readOnly() || ev.data?.readOnly) return;
      e.stopPropagation();
      evDragStartX = e.clientX;
      evDragStartY = e.clientY;
      evDragStarted = false;
      set(evDragId, ev.id, true);
      evDragEvent = ev;
      window.addEventListener("pointermove", onEvWindowPointerMove);
      window.addEventListener("pointerup", onEvWindowPointerUp, { once: true });
      window.addEventListener("pointercancel", onEvWindowPointerCancel, { once: true });
    }
    function onEvWindowPointerMove(e) {
      const ev = evDragEvent;
      if (!get(drag) || !ev || get(evDragId) !== ev.id) return;
      const dx = e.clientX - evDragStartX;
      const dy = e.clientY - evDragStartY;
      if (!evDragStarted && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      if (!evDragStarted) {
        evDragStarted = true;
        set(evDragging, true);
        get(drag).beginMove(ev.id, ev.start, ev.end);
      }
      const cellW = getCellWidth();
      const rowH = getRowHeight();
      const dayOffset = Math.round(dx / cellW);
      const weekOffset = Math.round(dy / rowH);
      const deltaMs = (dayOffset + weekOffset * 7) * DAY_MS;
      get(drag).updatePointer(new Date(ev.start.getTime() + deltaMs), new Date(ev.end.getTime() + deltaMs));
    }
    function cleanupEvDrag() {
      window.removeEventListener("pointermove", onEvWindowPointerMove);
      window.removeEventListener("pointerup", onEvWindowPointerUp);
      window.removeEventListener("pointercancel", onEvWindowPointerCancel);
      evDragStarted = false;
      set(evDragging, false);
      set(evDragId, null);
      evDragEvent = null;
    }
    function onEvWindowPointerUp() {
      if (!get(drag)) {
        cleanupEvDrag();
        return;
      }
      if (!evDragStarted) {
        if (evDragEvent) $$props.oneventclick?.(evDragEvent);
      } else {
        get(commitDragCtx)?.();
      }
      cleanupEvDrag();
    }
    function onEvWindowPointerCancel() {
      if (get(drag) && evDragStarted) get(drag).cancel();
      cleanupEvDrag();
    }
    var div = root$4();
    let classes;
    let styles;
    var div_1 = child(div);
    each(div_1, 21, () => get(weeks), (week) => week.weekStart, ($$anchor2, week) => {
      var div_2 = root_7$4();
      let classes_1;
      var div_3 = child(div_2);
      var div_4 = child(div_3);
      each(div_4, 21, () => get(week).days, (day) => day.ms, ($$anchor3, day) => {
        const visibleAllDaySegments = /* @__PURE__ */ user_derived(() => get(day).allDaySegments.filter((seg) => !isDraggedEvent(seg.ev.id)));
        const visibleTimedEvents = /* @__PURE__ */ user_derived(() => timedEventsForDay(get(day)));
        const previewTimedEvent = /* @__PURE__ */ user_derived(() => dragPreviewTimedForDay(get(day).ms));
        const previewSegment = /* @__PURE__ */ user_derived(() => dragPreviewSegmentForDay(get(day).ms));
        var div_5 = root_8$4();
        let classes_2;
        var div_6 = child(div_5);
        let classes_3;
        var node_3 = child(div_6);
        {
          var consequent_3 = ($$anchor4) => {
            var span_6 = root_9$3();
            let classes_4;
            var text_5 = child(span_6, true);
            reset(span_6);
            template_effect(() => {
              classes_4 = set_class(span_6, 1, "wg-day-num svelte-j4rvbp", null, classes_4, { "wg-day-num--today": get(day).isToday });
              set_text(text_5, get(day).dayNum);
            });
            append($$anchor4, span_6);
          };
          if_block(node_3, ($$render) => {
            if (get(showDates)) $$render(consequent_3);
          });
        }
        var span_7 = sibling(node_3, 2);
        var text_6 = child(span_7, true);
        reset(span_7);
        reset(div_6);
        var node_4 = sibling(div_6, 2);
        {
          var consequent_4 = ($$anchor4) => {
            var span_8 = root_10$3();
            var text_7 = child(span_8, true);
            reset(span_8);
            template_effect(() => set_text(text_7, get(day).monthLabel));
            append($$anchor4, span_8);
          };
          if_block(node_4, ($$render) => {
            if (get(day).monthLabel && get(showDates)) $$render(consequent_4);
          });
        }
        var node_5 = sibling(node_4, 2);
        {
          var consequent_5 = ($$anchor4) => {
            var div_7 = root_11$4();
            var node_6 = child(div_7);
            {
              let $0 = /* @__PURE__ */ user_derived(() => ({
                date: new Date(get(day).ms),
                isToday: get(day).isToday,
                dayName: weekdayShort(get(day).ms, $$props.locale)
              }));
              snippet(node_6, () => get(dayHeaderSnippet), () => get($0));
            }
            reset(div_7);
            append($$anchor4, div_7);
          };
          if_block(node_5, ($$render) => {
            if (get(dayHeaderSnippet)) $$render(consequent_5);
          });
        }
        var node_7 = sibling(node_5, 2);
        {
          var consequent_8 = ($$anchor4) => {
            const jsDay = /* @__PURE__ */ user_derived(() => new Date(get(day).ms).getDay());
            const isoDay = /* @__PURE__ */ user_derived(() => get(jsDay) === 0 ? 7 : get(jsDay));
            var fragment_3 = comment();
            var node_8 = first_child(fragment_3);
            each(node_8, 17, () => get(blockedSlots), index, ($$anchor5, slot) => {
              var fragment_4 = comment();
              var node_9 = first_child(fragment_4);
              {
                var consequent_7 = ($$anchor6) => {
                  var div_8 = root_14$4();
                  var node_10 = child(div_8);
                  {
                    var consequent_6 = ($$anchor7) => {
                      var span_9 = root_15$3();
                      var text_8 = child(span_9, true);
                      reset(span_9);
                      template_effect(() => set_text(text_8, get(slot).label));
                      append($$anchor7, span_9);
                    };
                    if_block(node_10, ($$render) => {
                      if (get(slot).label) $$render(consequent_6);
                    });
                  }
                  reset(div_8);
                  template_effect(() => set_attribute(div_8, "aria-label", get(slot).label || "Unavailable"));
                  append($$anchor6, div_8);
                };
                if_block(node_9, ($$render) => {
                  if (!get(slot).day || get(slot).day === get(isoDay)) $$render(consequent_7);
                });
              }
              append($$anchor5, fragment_4);
            });
            append($$anchor4, fragment_3);
          };
          if_block(node_7, ($$render) => {
            if (get(blockedSlots)?.length) $$render(consequent_8);
          });
        }
        var node_11 = sibling(node_7, 2);
        {
          var consequent_10 = ($$anchor4) => {
            var div_9 = root_16$3();
            var node_12 = child(div_9);
            each(node_12, 17, () => get(visibleAllDaySegments), (seg) => seg.ev.id, ($$anchor5, seg) => {
              var div_10 = root_17$2();
              let classes_5;
              let styles_1;
              var node_13 = child(div_10);
              allDaySegmentContent(node_13, () => get(seg));
              reset(div_10);
              template_effect(
                ($0) => {
                  classes_5 = set_class(div_10, 1, "wg-ad svelte-j4rvbp", null, classes_5, {
                    "wg-ad--start": get(seg).isStart,
                    "wg-ad--end": get(seg).isEnd,
                    "wg-ad--mid": !get(seg).isStart && !get(seg).isEnd,
                    "wg-ad--selected": selectedEventId() === get(seg).ev.id
                  });
                  set_attribute(div_10, "aria-label", `${get(seg).ev.title ?? ""}${$0 ?? ""}`);
                  styles_1 = set_style(div_10, "", styles_1, { "--ev-color": get(seg).ev.color ?? "var(--dt-accent)" });
                },
                [
                  () => get(seg).totalDays > 1 ? `, ${get(L).dayNOfTotal(get(seg).dayIndex, get(seg).totalDays)}` : `, ${get(L).allDay}`
                ]
              );
              delegated("pointerdown", div_10, (e) => onEventPointerDown(e, get(seg).ev));
              delegated("keydown", div_10, (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  $$props.oneventclick?.(get(seg).ev);
                }
              });
              append($$anchor5, div_10);
            });
            var node_14 = sibling(node_12, 2);
            {
              var consequent_9 = ($$anchor5) => {
                var div_11 = root_18$2();
                let classes_6;
                let styles_2;
                var node_15 = child(div_11);
                allDaySegmentContent(node_15, () => get(previewSegment));
                reset(div_11);
                template_effect(() => {
                  classes_6 = set_class(div_11, 1, "wg-ad wg-ad--drag-preview svelte-j4rvbp", null, classes_6, {
                    "wg-ad--start": get(previewSegment).isStart,
                    "wg-ad--end": get(previewSegment).isEnd,
                    "wg-ad--mid": !get(previewSegment).isStart && !get(previewSegment).isEnd
                  });
                  styles_2 = set_style(div_11, "", styles_2, {
                    "--ev-color": get(previewSegment).ev.color ?? "var(--dt-accent)"
                  });
                });
                append($$anchor5, div_11);
              };
              if_block(node_14, ($$render) => {
                if (get(previewSegment)) $$render(consequent_9);
              });
            }
            reset(div_9);
            append($$anchor4, div_9);
          };
          if_block(node_11, ($$render) => {
            if (get(visibleAllDaySegments).length > 0 || get(previewSegment)) $$render(consequent_10);
          });
        }
        var div_12 = sibling(node_11, 2);
        var node_16 = child(div_12);
        each(node_16, 17, () => get(visibleTimedEvents).slice(0, MAX_EVENTS_SHOWN), (ev) => ev.id, ($$anchor4, ev) => {
          var div_13 = root_19$2();
          let classes_7;
          let styles_3;
          var node_17 = child(div_13);
          timedEventContent(node_17, () => get(ev));
          reset(div_13);
          template_effect(
            ($0, $1) => {
              classes_7 = set_class(div_13, 1, "wg-ev svelte-j4rvbp", null, classes_7, $0);
              set_attribute(div_13, "aria-label", `${get(ev).title ?? ""}${get(ev).status === "cancelled" ? ` (cancelled)` : ""}${get(ev).status === "tentative" ? ` (tentative)` : ""}${get(ev).status === "full" ? ` (full)` : ""}${get(ev).status === "limited" ? ` (limited)` : ""}${$1 ?? ""}`);
              styles_3 = set_style(div_13, "", styles_3, { "--ev-color": get(ev).color ?? "var(--dt-accent)" });
            },
            [
              () => ({
                "wg-ev--selected": selectedEventId() === get(ev).id,
                "wg-ev--current": get(ev).start.getTime() <= clock.tick && get(ev).end.getTime() > clock.tick,
                "wg-ev--dragging": get(evDragging) && get(evDragId) === get(ev).id,
                "wg-ev--readonly": get(ev).data?.readOnly,
                "wg-ev--cancelled": get(ev).status === "cancelled",
                "wg-ev--tentative": get(ev).status === "tentative",
                "wg-ev--full": get(ev).status === "full",
                "wg-ev--limited": get(ev).status === "limited"
              }),
              () => get(ev).start.getTime() <= clock.tick && get(ev).end.getTime() > clock.tick ? ` (${get(L).inProgress})` : ""
            ]
          );
          delegated("pointerdown", div_13, (e) => onEventPointerDown(e, get(ev)));
          event("pointerenter", div_13, () => get(oneventhover)?.(get(ev)));
          delegated("keydown", div_13, (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              $$props.oneventclick?.(get(ev));
            }
          });
          append($$anchor4, div_13);
        });
        var node_18 = sibling(node_16, 2);
        {
          var consequent_11 = ($$anchor4) => {
            var div_14 = root_20$2();
            let styles_4;
            var node_19 = child(div_14);
            timedEventContent(node_19, () => get(previewTimedEvent));
            reset(div_14);
            template_effect(() => styles_4 = set_style(div_14, "", styles_4, {
              "--ev-color": get(previewTimedEvent).color ?? "var(--dt-accent)"
            }));
            append($$anchor4, div_14);
          };
          if_block(node_18, ($$render) => {
            if (get(previewTimedEvent)) $$render(consequent_11);
          });
        }
        var node_20 = sibling(node_18, 2);
        {
          var consequent_12 = ($$anchor4) => {
            var div_15 = root_21$2();
            var text_9 = child(div_15, true);
            reset(div_15);
            template_effect(($0) => set_text(text_9, $0), [
              () => get(L).nMore(get(visibleTimedEvents).length - MAX_EVENTS_SHOWN)
            ]);
            append($$anchor4, div_15);
          };
          if_block(node_20, ($$render) => {
            if (get(visibleTimedEvents).length > MAX_EVENTS_SHOWN) $$render(consequent_12);
          });
        }
        reset(div_12);
        reset(div_5);
        template_effect(
          ($0, $1, $2, $3, $4) => {
            classes_2 = set_class(div_5, 1, "wg-cell svelte-j4rvbp", null, classes_2, $0);
            set_attribute(div_5, "aria-label", `${$1 ?? ""}${$2 ?? ""}, ${$3 ?? ""}`);
            classes_3 = set_class(div_6, 1, "wg-cell-hd svelte-j4rvbp", null, classes_3, { "wg-cell-hd--today": get(day).isToday });
            set_text(text_6, $4);
          },
          [
            () => ({
              "wg-cell--today": get(day).isToday,
              "wg-cell--past": get(day).isPast,
              "wg-cell--weekend": get(day).isWeekend,
              "wg-cell--disabled": get(disabledSet).has(get(day).ms)
            }),
            () => new Date(get(day).ms).toLocaleDateString($$props.locale ?? "en-US", { weekday: "long", month: "short", day: "numeric" }),
            () => get(day).isToday ? ` (${get(L).today.toLowerCase()})` : "",
            () => get(L).nEvents(get(day).events.length),
            () => weekdayShort(get(day).ms, $$props.locale)
          ]
        );
        delegated("click", div_5, (e) => handleDayCellClick(get(day).ms, e));
        delegated("keydown", div_5, (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleDayCellClick(get(day).ms, e);
          }
        });
        append($$anchor3, div_5);
      });
      reset(div_4);
      reset(div_3);
      reset(div_2);
      template_effect(() => {
        classes_1 = set_class(div_2, 1, "wg-week svelte-j4rvbp", null, classes_1, { "wg-week--current": get(week).isCurrent });
        set_attribute(div_2, "data-week", get(week).weekStart);
      });
      append($$anchor2, div_2);
    });
    reset(div_1);
    bind_this(div_1, ($$value) => el = $$value, () => el);
    var node_21 = sibling(div_1, 2);
    {
      var consequent_13 = ($$anchor2) => {
        var nav = root_22$2();
        var button = child(nav);
        var text_10 = child(button, true);
        reset(button);
        reset(nav);
        template_effect(() => {
          set_attribute(nav, "aria-label", get(L).weekNavigation);
          set_attribute(button, "aria-label", get(L).goToToday);
          set_text(text_10, get(L).today);
        });
        delegated("click", button, jumpToday);
        append($$anchor2, nav);
      };
      if_block(node_21, ($$render) => {
        if (get(showNav) && get(scrolled)) $$render(consequent_13);
      });
    }
    reset(div);
    template_effect(() => {
      classes = set_class(div, 1, "wg svelte-j4rvbp", null, classes, { "wg--auto": get(autoHeight) });
      styles = set_style(div, style() || void 0, styles, {
        height: get(autoHeight) ? void 0 : height() ? `${height()}px` : "100%"
      });
      set_attribute(div_1, "aria-label", get(L).multiWeekGrid);
    });
    event("scroll", div_1, handleUserScroll);
    append($$anchor, div);
    pop();
  }
  delegate(["click", "keydown", "pointerdown"]);
  function Planner($$anchor, $$props) {
    let mode = prop($$props, "mode", 3, "week"), rest = /* @__PURE__ */ rest_props($$props, ["$$slots", "$$events", "$$legacy", "mode"]);
    var fragment = comment();
    var node = first_child(fragment);
    {
      var consequent = ($$anchor2) => {
        PlannerDay($$anchor2, spread_props(() => rest));
      };
      var alternate = ($$anchor2) => {
        PlannerWeek($$anchor2, spread_props(() => rest));
      };
      if_block(node, ($$render) => {
        if (mode() === "day") $$render(consequent);
        else $$render(alternate, -1);
      });
    }
    append($$anchor, fragment);
  }
  function fmtTime(d, locale) {
    return fmtTime$1(d, locale);
  }
  function duration(ev) {
    return fmtDuration(ev.start, ev.end);
  }
  function timeUntilMs(ms, now) {
    const L = getLabels();
    const diff = ms - now;
    if (diff <= 0) return L.now;
    const tMins = Math.floor(diff / 6e4);
    if (tMins < 60) return `in ${tMins}m`;
    const hrs = Math.floor(tMins / 60);
    const rm = tMins % 60;
    if (hrs < 24) return rm > 0 ? `in ${hrs}h ${rm}m` : `in ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `in ${days}d`;
  }
  function progress(ev, now) {
    const s = ev.start.getTime();
    const e = ev.end.getTime();
    return Math.min(1, Math.max(0, (now - s) / (e - s)));
  }
  function groupIntoSlots(evts) {
    const sorted = [...evts].sort((a, b) => a.start.getTime() - b.start.getTime());
    const slots = [];
    for (const ev of sorted) {
      const last = slots[slots.length - 1];
      if (last && ev.start.getTime() < last.endMs) {
        last.events.push(ev);
        last.endMs = Math.max(last.endMs, ev.end.getTime());
      } else {
        slots.push({
          startMs: ev.start.getTime(),
          endMs: ev.end.getTime(),
          events: [ev]
        });
      }
    }
    return slots;
  }
  var root_2$4 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="ag-allday-dot svelte-n8lbn1"></span> <span class="ag-allday-title svelte-n8lbn1"> </span></div>`);
  var root_1$3 = /* @__PURE__ */ from_html(`<div class="ag-allday svelte-n8lbn1"><div class="ag-allday-label svelte-n8lbn1"> </div> <div class="ag-allday-items svelte-n8lbn1"></div></div>`);
  var root_4$3 = /* @__PURE__ */ from_html(`<div class="ag-q-empty svelte-n8lbn1"> </div>`);
  var root_7$3 = /* @__PURE__ */ from_html(`<span class="ag-compact-row-sub svelte-n8lbn1"> </span>`);
  var root_9$2 = /* @__PURE__ */ from_html(`<span class="ag-compact-row-tag svelte-n8lbn1"> </span>`);
  var root_6$4 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="ag-compact-row-dot svelte-n8lbn1"></span> <span class="ag-compact-row-time svelte-n8lbn1"> </span> <span class="ag-compact-row-title svelte-n8lbn1"> </span> <!> <!> <span class="ag-compact-row-dur svelte-n8lbn1"> </span></div>`);
  var root_3$3 = /* @__PURE__ */ from_html(`<div class="ag-compact-list svelte-n8lbn1"><!></div>`);
  var root_12$2 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="ag-q-done-check svelte-n8lbn1">✓</span> <span class="ag-q-done-title svelte-n8lbn1"> </span></div>`);
  var root_11$3 = /* @__PURE__ */ from_html(`<div class="ag-q-done-section svelte-n8lbn1"><div class="ag-q-label svelte-n8lbn1"> </div> <!></div>`);
  var root_14$3 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><div class="ag-q-now-dot svelte-n8lbn1"></div> <div class="ag-q-now-title svelte-n8lbn1"> </div> <div class="ag-q-now-time svelte-n8lbn1"> </div> <div class="ag-q-now-track svelte-n8lbn1"><div class="ag-q-now-fill svelte-n8lbn1"></div></div></div>`);
  var root_15$2 = /* @__PURE__ */ from_html(`<div class="ag-q-free svelte-n8lbn1"><div class="ag-q-free-label svelte-n8lbn1"> </div></div>`);
  var root_16$2 = /* @__PURE__ */ from_html(`<div class="ag-q-empty svelte-n8lbn1"> </div>`);
  var root_19$1 = /* @__PURE__ */ from_html(`<span class="ag-card-sub svelte-n8lbn1"> </span>`);
  var root_21$1 = /* @__PURE__ */ from_html(`<span class="ag-card-tag svelte-n8lbn1"> </span>`);
  var root_20$1 = /* @__PURE__ */ from_html(`<div class="ag-card-tags svelte-n8lbn1"></div>`);
  var root_18$1 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><div class="ag-card-body svelte-n8lbn1"><div class="ag-card-top svelte-n8lbn1"><span class="ag-card-title svelte-n8lbn1"> </span> <span class="ag-card-eta svelte-n8lbn1"> </span></div> <!> <div class="ag-card-meta svelte-n8lbn1"> <span class="ag-card-dur svelte-n8lbn1"> </span></div> <!></div></div>`);
  var root_10$2 = /* @__PURE__ */ from_html(`<div class="ag-q svelte-n8lbn1"><div class="ag-q-status svelte-n8lbn1"><!> <div class="ag-q-label svelte-n8lbn1"> <span class="ag-q-clock svelte-n8lbn1"> </span></div> <!></div> <div class="ag-q-queue svelte-n8lbn1"><div class="ag-q-label svelte-n8lbn1"> </div> <!></div></div>`);
  var root_23$1 = /* @__PURE__ */ from_html(`<div class="ag-q-empty svelte-n8lbn1"> </div>`);
  var root_25 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="ag-log-check svelte-n8lbn1">✓</span> <span class="ag-log-time svelte-n8lbn1"> </span> <span class="ag-log-dot svelte-n8lbn1"></span> <span class="ag-log-title svelte-n8lbn1"> </span> <span class="ag-log-dur svelte-n8lbn1"> </span></div>`);
  var root_22$1 = /* @__PURE__ */ from_html(`<div class="ag-log svelte-n8lbn1"><!></div>`);
  var root_27$1 = /* @__PURE__ */ from_html(`<div class="ag-q-empty svelte-n8lbn1"> </div>`);
  var root_30$1 = /* @__PURE__ */ from_html(`<span class="ag-card-sub svelte-n8lbn1"> </span>`);
  var root_31 = /* @__PURE__ */ from_html(`<span class="ag-card-loc svelte-n8lbn1"> </span>`);
  var root_33$1 = /* @__PURE__ */ from_html(`<span class="ag-card-tag svelte-n8lbn1"> </span>`);
  var root_32$1 = /* @__PURE__ */ from_html(`<div class="ag-card-tags svelte-n8lbn1"></div>`);
  var root_29 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><div class="ag-card-body svelte-n8lbn1"><div class="ag-card-top svelte-n8lbn1"><span class="ag-card-order svelte-n8lbn1"> </span> <span class="ag-card-title svelte-n8lbn1"> </span></div> <!> <!> <div class="ag-card-meta svelte-n8lbn1"> <span class="ag-card-dur svelte-n8lbn1"> </span></div> <!></div></div>`);
  var root_26$1 = /* @__PURE__ */ from_html(`<div class="ag-plan svelte-n8lbn1"><!></div>`);
  var root_34 = /* @__PURE__ */ from_html(`<div class="ag-date-label svelte-n8lbn1"> </div>`);
  var root_35$1 = /* @__PURE__ */ from_html(`<nav class="ag-nav svelte-n8lbn1"><button> </button> <button class="ag-nav-pill svelte-n8lbn1"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true" class="svelte-n8lbn1"><path d="M10 3 5 8l5 5" class="svelte-n8lbn1"></path></svg></button> <button class="ag-nav-pill svelte-n8lbn1"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true" class="svelte-n8lbn1"><path d="M6 3l5 5-5 5" class="svelte-n8lbn1"></path></svg></button></nav>`);
  var root$3 = /* @__PURE__ */ from_html(`<div><div class="ag-body svelte-n8lbn1" role="list"><!> <!></div> <!> <!></div>`);
  function AgendaDay($$anchor, $$props) {
    push($$props, true);
    const L = /* @__PURE__ */ user_derived(getLabels);
    const ctx = useCalendarContext();
    let events = prop($$props, "events", 19, () => []), style = prop($$props, "style", 3, ""), selectedEventId = prop($$props, "selectedEventId", 3, null);
    const clock = createClock();
    const viewState = /* @__PURE__ */ user_derived(() => ctx.viewState);
    const showNav = /* @__PURE__ */ user_derived(() => ctx.showNav);
    const equalDays = /* @__PURE__ */ user_derived(() => ctx.equalDays);
    const showDates = /* @__PURE__ */ user_derived(() => ctx.showDates);
    const isMobile = /* @__PURE__ */ user_derived(() => ctx.isMobile);
    const autoHeight = /* @__PURE__ */ user_derived(() => ctx.autoHeight);
    const compact = /* @__PURE__ */ user_derived(() => ctx.compact);
    const oneventhover = /* @__PURE__ */ user_derived(() => ctx.oneventhover);
    const disabledSet = /* @__PURE__ */ user_derived(() => ctx.disabledSet);
    let swipeStartX = 0;
    let swipeStartY = 0;
    const SWIPE_THRESHOLD = 50;
    function onPointerDown(e) {
      if (!get(isMobile)) return;
      swipeStartX = e.clientX;
      swipeStartY = e.clientY;
    }
    function onPointerUp(e) {
      if (!get(isMobile)) return;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx > 0) get(viewState)?.prev();
        else get(viewState)?.next();
      }
    }
    const fmt = (d) => fmtTime(d, $$props.locale);
    const eta = (ms) => timeUntilMs(ms, clock.tick);
    const prog = (ev) => progress(ev, clock.tick);
    function handleClick(ev) {
      $$props.oneventclick?.(ev);
    }
    function handleKeydown(e, ev) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        $$props.oneventclick?.(ev);
      }
    }
    const dayMs = /* @__PURE__ */ user_derived(() => $$props.focusDate ? sod($$props.focusDate.getTime()) : clock.today);
    const dayEnd = /* @__PURE__ */ user_derived(() => get(dayMs) + DAY_MS);
    const isToday = /* @__PURE__ */ user_derived(() => get(dayMs) === clock.today);
    const isPastDay = /* @__PURE__ */ user_derived(() => get(equalDays) ? false : get(dayMs) < clock.today);
    const dateLabel = /* @__PURE__ */ user_derived(() => get(showDates) ? new Date(get(dayMs)).toLocaleDateString($$props.locale ?? "en-US", { weekday: "long", month: "long", day: "numeric" }) : new Date(get(dayMs)).toLocaleDateString($$props.locale ?? "en-US", { weekday: "long" }));
    const dayEvents = /* @__PURE__ */ user_derived(() => {
      return events().filter((ev) => ev.start.getTime() < get(dayEnd) && ev.end.getTime() > get(dayMs)).sort((a, b) => a.start.getTime() - b.start.getTime());
    });
    const allDayBanner = /* @__PURE__ */ user_derived(() => get(dayEvents).filter((ev) => isAllDay(ev) || isMultiDay(ev)));
    const timedDayEvents = /* @__PURE__ */ user_derived(() => get(dayEvents).filter((ev) => !isAllDay(ev) && !isMultiDay(ev)));
    const dayCat = /* @__PURE__ */ user_derived(() => {
      const now = clock.tick;
      const past = [];
      const current = [];
      const upcoming = [];
      for (const ev of get(timedDayEvents)) {
        const s = ev.start.getTime();
        const e = ev.end.getTime();
        if (e <= now) past.push(ev);
        else if (s <= now && e > now) current.push(ev);
        else upcoming.push(ev);
      }
      return {
        past,
        current,
        upcomingSlots: groupIntoSlots(upcoming),
        totalUp: upcoming.length
      };
    });
    const upcomingNext = /* @__PURE__ */ user_derived(() => {
      const all = [];
      for (const slot of get(dayCat).upcomingSlots) {
        for (const ev of slot.events) {
          all.push(ev);
          if (all.length >= 5) return all;
        }
      }
      return all;
    });
    var div = root$3();
    let classes;
    let styles;
    var div_1 = child(div);
    var node = child(div_1);
    {
      var consequent = ($$anchor2) => {
        var div_2 = root_1$3();
        var div_3 = child(div_2);
        var text2 = child(div_3, true);
        reset(div_3);
        var div_4 = sibling(div_3, 2);
        each(div_4, 21, () => get(allDayBanner), (ev) => ev.id, ($$anchor3, ev) => {
          var div_5 = root_2$4();
          let classes_1;
          let styles_1;
          var span = sibling(child(div_5), 2);
          var text_1 = child(span, true);
          reset(span);
          reset(div_5);
          template_effect(() => {
            classes_1 = set_class(div_5, 1, "ag-allday-chip svelte-n8lbn1", null, classes_1, {
              "ag-allday-chip--selected": selectedEventId() === get(ev).id
            });
            set_attribute(div_5, "aria-label", `${get(ev).title ?? ""}, ${get(L).allDay ?? ""}`);
            styles_1 = set_style(div_5, "", styles_1, { "--ev-color": get(ev).color || "var(--dt-accent)" });
            set_text(text_1, get(ev).title);
          });
          delegated("click", div_5, () => handleClick(get(ev)));
          event("pointerenter", div_5, () => get(oneventhover)?.(get(ev)));
          delegated("keydown", div_5, (e) => handleKeydown(e, get(ev)));
          append($$anchor3, div_5);
        });
        reset(div_4);
        reset(div_2);
        template_effect(() => set_text(text2, get(L).allDay));
        append($$anchor2, div_2);
      };
      if_block(node, ($$render) => {
        if (get(allDayBanner).length > 0) $$render(consequent);
      });
    }
    var node_1 = sibling(node, 2);
    {
      var consequent_4 = ($$anchor2) => {
        var div_6 = root_3$3();
        var node_2 = child(div_6);
        {
          var consequent_1 = ($$anchor3) => {
            var div_7 = root_4$3();
            var text_2 = child(div_7, true);
            reset(div_7);
            template_effect(() => set_text(text_2, get(L).nothingScheduledYet));
            append($$anchor3, div_7);
          };
          var alternate = ($$anchor3) => {
            var fragment = comment();
            var node_3 = first_child(fragment);
            each(node_3, 17, () => get(timedDayEvents), (ev) => ev.id, ($$anchor4, ev) => {
              var div_8 = root_6$4();
              let classes_2;
              let styles_2;
              var span_1 = sibling(child(div_8), 2);
              var text_3 = child(span_1, true);
              reset(span_1);
              var span_2 = sibling(span_1, 2);
              var text_4 = child(span_2, true);
              reset(span_2);
              var node_4 = sibling(span_2, 2);
              {
                var consequent_2 = ($$anchor5) => {
                  var span_3 = root_7$3();
                  var text_5 = child(span_3, true);
                  reset(span_3);
                  template_effect(() => set_text(text_5, get(ev).subtitle));
                  append($$anchor5, span_3);
                };
                if_block(node_4, ($$render) => {
                  if (get(ev).subtitle) $$render(consequent_2);
                });
              }
              var node_5 = sibling(node_4, 2);
              {
                var consequent_3 = ($$anchor5) => {
                  var fragment_1 = comment();
                  var node_6 = first_child(fragment_1);
                  each(node_6, 17, () => get(ev).tags, index, ($$anchor6, tag) => {
                    var span_4 = root_9$2();
                    var text_6 = child(span_4, true);
                    reset(span_4);
                    template_effect(() => set_text(text_6, get(tag)));
                    append($$anchor6, span_4);
                  });
                  append($$anchor5, fragment_1);
                };
                if_block(node_5, ($$render) => {
                  if (get(ev).tags?.length) $$render(consequent_3);
                });
              }
              var span_5 = sibling(node_5, 2);
              var text_7 = child(span_5, true);
              reset(span_5);
              reset(div_8);
              template_effect(
                ($0, $1, $2, $3) => {
                  classes_2 = set_class(div_8, 1, "ag-compact-row svelte-n8lbn1", null, classes_2, {
                    "ag-compact-row--selected": selectedEventId() === get(ev).id,
                    "ag-compact-row--cancelled": get(ev).status === "cancelled",
                    "ag-compact-row--tentative": get(ev).status === "tentative"
                  });
                  set_attribute(div_8, "aria-label", `${get(ev).title ?? ""}, ${$0 ?? ""}, ${$1 ?? ""}`);
                  styles_2 = set_style(div_8, "", styles_2, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                  set_text(text_3, $2);
                  set_text(text_4, get(ev).title);
                  set_text(text_7, $3);
                },
                [
                  () => fmt(get(ev).start),
                  () => duration(get(ev)),
                  () => fmt(get(ev).start),
                  () => duration(get(ev))
                ]
              );
              delegated("click", div_8, () => handleClick(get(ev)));
              event("pointerenter", div_8, () => get(oneventhover)?.(get(ev)));
              delegated("keydown", div_8, (e) => handleKeydown(e, get(ev)));
              append($$anchor4, div_8);
            });
            append($$anchor3, fragment);
          };
          if_block(node_2, ($$render) => {
            if (get(timedDayEvents).length === 0 && get(allDayBanner).length === 0) $$render(consequent_1);
            else $$render(alternate, -1);
          });
        }
        reset(div_6);
        append($$anchor2, div_6);
      };
      var consequent_10 = ($$anchor2) => {
        var div_9 = root_10$2();
        var div_10 = child(div_9);
        var node_7 = child(div_10);
        {
          var consequent_5 = ($$anchor3) => {
            var div_11 = root_11$3();
            var div_12 = child(div_11);
            var text_8 = child(div_12, true);
            reset(div_12);
            var node_8 = sibling(div_12, 2);
            each(node_8, 17, () => get(dayCat).past, (ev) => ev.id, ($$anchor4, ev) => {
              var div_13 = root_12$2();
              let classes_3;
              var span_6 = sibling(child(div_13), 2);
              var text_9 = child(span_6, true);
              reset(span_6);
              reset(div_13);
              template_effect(
                ($0) => {
                  classes_3 = set_class(div_13, 1, "ag-q-done-item svelte-n8lbn1", null, classes_3, {
                    "ag-q-done-item--selected": selectedEventId() === get(ev).id
                  });
                  set_attribute(div_13, "aria-label", `${get(ev).title ?? ""}, ${get(L).completed ?? ""}, ${$0 ?? ""}`);
                  set_text(text_9, get(ev).title);
                },
                [() => fmt(get(ev).start)]
              );
              delegated("click", div_13, () => handleClick(get(ev)));
              delegated("keydown", div_13, (e) => handleKeydown(e, get(ev)));
              append($$anchor4, div_13);
            });
            reset(div_11);
            template_effect(() => set_text(text_8, get(L).done));
            append($$anchor3, div_11);
          };
          if_block(node_7, ($$render) => {
            if (get(dayCat).past.length > 0) $$render(consequent_5);
          });
        }
        var div_14 = sibling(node_7, 2);
        var text_10 = child(div_14);
        var span_7 = sibling(text_10);
        var text_11 = child(span_7, true);
        reset(span_7);
        reset(div_14);
        var node_9 = sibling(div_14, 2);
        {
          var consequent_6 = ($$anchor3) => {
            var fragment_2 = comment();
            var node_10 = first_child(fragment_2);
            each(node_10, 17, () => get(dayCat).current, (ev) => ev.id, ($$anchor4, ev) => {
              var div_15 = root_14$3();
              let classes_4;
              let styles_3;
              var div_16 = sibling(child(div_15), 2);
              var text_12 = child(div_16, true);
              reset(div_16);
              var div_17 = sibling(div_16, 2);
              var text_13 = child(div_17);
              reset(div_17);
              var div_18 = sibling(div_17, 2);
              var div_19 = child(div_18);
              let styles_4;
              reset(div_18);
              reset(div_15);
              template_effect(
                ($0, $1, $2) => {
                  classes_4 = set_class(div_15, 1, "ag-q-now svelte-n8lbn1", null, classes_4, { "ag-q-now--selected": selectedEventId() === get(ev).id });
                  set_attribute(div_15, "aria-label", `${get(ev).title ?? ""}, ${get(L).happeningNow ?? ""}, ${$0 ?? ""}`);
                  styles_3 = set_style(div_15, "", styles_3, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                  set_text(text_12, get(ev).title);
                  set_text(text_13, `${get(L).until ?? ""} ${$1 ?? ""}`);
                  styles_4 = set_style(div_19, "", styles_4, $2);
                },
                [
                  () => get(L).percentComplete(Math.round(prog(get(ev)) * 100)),
                  () => fmt(get(ev).end),
                  () => ({ width: `${prog(get(ev)) * 100}%` })
                ]
              );
              delegated("click", div_15, () => handleClick(get(ev)));
              event("pointerenter", div_15, () => get(oneventhover)?.(get(ev)));
              delegated("keydown", div_15, (e) => handleKeydown(e, get(ev)));
              append($$anchor4, div_15);
            });
            append($$anchor3, fragment_2);
          };
          var alternate_1 = ($$anchor3) => {
            var div_20 = root_15$2();
            var div_21 = child(div_20);
            var text_14 = child(div_21, true);
            reset(div_21);
            reset(div_20);
            template_effect(() => set_text(text_14, get(L).free));
            append($$anchor3, div_20);
          };
          if_block(node_9, ($$render) => {
            if (get(dayCat).current.length > 0) $$render(consequent_6);
            else $$render(alternate_1, -1);
          });
        }
        reset(div_10);
        var div_22 = sibling(div_10, 2);
        var div_23 = child(div_22);
        var text_15 = child(div_23, true);
        reset(div_23);
        var node_11 = sibling(div_23, 2);
        {
          var consequent_7 = ($$anchor3) => {
            var div_24 = root_16$2();
            var text_16 = child(div_24, true);
            reset(div_24);
            template_effect(() => set_text(text_16, get(dayCat).past.length > 0 ? get(L).allDoneForToday : get(L).nothingScheduled));
            append($$anchor3, div_24);
          };
          var alternate_2 = ($$anchor3) => {
            var fragment_3 = comment();
            var node_12 = first_child(fragment_3);
            each(node_12, 19, () => get(upcomingNext), (ev) => ev.id, ($$anchor4, ev, i) => {
              var div_25 = root_18$1();
              let classes_5;
              let styles_5;
              var div_26 = child(div_25);
              var div_27 = child(div_26);
              var span_8 = child(div_27);
              var text_17 = child(span_8, true);
              reset(span_8);
              var span_9 = sibling(span_8, 2);
              var text_18 = child(span_9, true);
              reset(span_9);
              reset(div_27);
              var node_13 = sibling(div_27, 2);
              {
                var consequent_8 = ($$anchor5) => {
                  var span_10 = root_19$1();
                  var text_19 = child(span_10, true);
                  reset(span_10);
                  template_effect(() => set_text(text_19, get(ev).subtitle));
                  append($$anchor5, span_10);
                };
                if_block(node_13, ($$render) => {
                  if (get(ev).subtitle) $$render(consequent_8);
                });
              }
              var div_28 = sibling(node_13, 2);
              var text_20 = child(div_28);
              var span_11 = sibling(text_20);
              var text_21 = child(span_11, true);
              reset(span_11);
              reset(div_28);
              var node_14 = sibling(div_28, 2);
              {
                var consequent_9 = ($$anchor5) => {
                  var div_29 = root_20$1();
                  each(div_29, 21, () => get(ev).tags, index, ($$anchor6, tag) => {
                    var span_12 = root_21$1();
                    var text_22 = child(span_12, true);
                    reset(span_12);
                    template_effect(() => set_text(text_22, get(tag)));
                    append($$anchor6, span_12);
                  });
                  reset(div_29);
                  append($$anchor5, div_29);
                };
                if_block(node_14, ($$render) => {
                  if (get(ev).tags?.length) $$render(consequent_9);
                });
              }
              reset(div_26);
              reset(div_25);
              template_effect(
                ($0, $1, $2, $3, $4, $5) => {
                  classes_5 = set_class(div_25, 1, "ag-card ag-card--q svelte-n8lbn1", null, classes_5, {
                    "ag-card--hero": get(i) === 0,
                    "ag-card--selected": selectedEventId() === get(ev).id
                  });
                  set_attribute(div_25, "aria-label", `${get(ev).title ?? ""}, ${$0 ?? ""}, ${$1 ?? ""}`);
                  styles_5 = set_style(div_25, "", styles_5, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                  set_text(text_17, get(ev).title);
                  set_text(text_18, $2);
                  set_text(text_20, `${$3 ?? ""} – ${$4 ?? ""} `);
                  set_text(text_21, $5);
                },
                [
                  () => fmt(get(ev).start),
                  () => duration(get(ev)),
                  () => eta(get(ev).start.getTime()),
                  () => fmt(get(ev).start),
                  () => fmt(get(ev).end),
                  () => duration(get(ev))
                ]
              );
              delegated("click", div_25, () => handleClick(get(ev)));
              event("pointerenter", div_25, () => get(oneventhover)?.(get(ev)));
              delegated("keydown", div_25, (e) => handleKeydown(e, get(ev)));
              append($$anchor4, div_25);
            });
            append($$anchor3, fragment_3);
          };
          if_block(node_11, ($$render) => {
            if (get(upcomingNext).length === 0) $$render(consequent_7);
            else $$render(alternate_2, -1);
          });
        }
        reset(div_22);
        reset(div_9);
        template_effect(() => {
          set_text(text_10, `${get(L).now ?? ""} `);
          set_text(text_11, clock.hm);
          set_text(text_15, get(L).upNext);
        });
        append($$anchor2, div_9);
      };
      var consequent_12 = ($$anchor2) => {
        var div_30 = root_22$1();
        var node_15 = child(div_30);
        {
          var consequent_11 = ($$anchor3) => {
            var div_31 = root_23$1();
            var text_23 = child(div_31, true);
            reset(div_31);
            template_effect(() => set_text(text_23, get(L).nothingWasScheduled));
            append($$anchor3, div_31);
          };
          var alternate_3 = ($$anchor3) => {
            var fragment_4 = comment();
            var node_16 = first_child(fragment_4);
            each(node_16, 17, () => get(timedDayEvents), (ev) => ev.id, ($$anchor4, ev) => {
              var div_32 = root_25();
              let classes_6;
              let styles_6;
              var span_13 = sibling(child(div_32), 2);
              var text_24 = child(span_13, true);
              reset(span_13);
              var span_14 = sibling(span_13, 2);
              let styles_7;
              var span_15 = sibling(span_14, 2);
              var text_25 = child(span_15, true);
              reset(span_15);
              var span_16 = sibling(span_15, 2);
              var text_26 = child(span_16, true);
              reset(span_16);
              reset(div_32);
              template_effect(
                ($0, $1, $2, $3) => {
                  classes_6 = set_class(div_32, 1, "ag-log-row svelte-n8lbn1", null, classes_6, { "ag-log-row--selected": selectedEventId() === get(ev).id });
                  set_attribute(div_32, "aria-label", `${get(ev).title ?? ""}, ${$0 ?? ""} to ${$1 ?? ""}`);
                  styles_6 = set_style(div_32, "", styles_6, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                  set_text(text_24, $2);
                  styles_7 = set_style(span_14, "", styles_7, { background: get(ev).color || "var(--dt-accent)" });
                  set_text(text_25, get(ev).title);
                  set_text(text_26, $3);
                },
                [
                  () => fmt(get(ev).start),
                  () => fmt(get(ev).end),
                  () => fmt(get(ev).start),
                  () => duration(get(ev))
                ]
              );
              delegated("click", div_32, () => handleClick(get(ev)));
              event("pointerenter", div_32, () => get(oneventhover)?.(get(ev)));
              delegated("keydown", div_32, (e) => handleKeydown(e, get(ev)));
              append($$anchor4, div_32);
            });
            append($$anchor3, fragment_4);
          };
          if_block(node_15, ($$render) => {
            if (get(timedDayEvents).length === 0 && get(allDayBanner).length === 0) $$render(consequent_11);
            else $$render(alternate_3, -1);
          });
        }
        reset(div_30);
        append($$anchor2, div_30);
      };
      var alternate_5 = ($$anchor2) => {
        var div_33 = root_26$1();
        var node_17 = child(div_33);
        {
          var consequent_13 = ($$anchor3) => {
            var div_34 = root_27$1();
            var text_27 = child(div_34, true);
            reset(div_34);
            template_effect(() => set_text(text_27, get(L).nothingScheduledYet));
            append($$anchor3, div_34);
          };
          var alternate_4 = ($$anchor3) => {
            var fragment_5 = comment();
            var node_18 = first_child(fragment_5);
            each(node_18, 19, () => get(timedDayEvents), (ev) => ev.id, ($$anchor4, ev, i) => {
              var div_35 = root_29();
              let classes_7;
              let styles_8;
              var div_36 = child(div_35);
              var div_37 = child(div_36);
              var span_17 = child(div_37);
              var text_28 = child(span_17, true);
              reset(span_17);
              var span_18 = sibling(span_17, 2);
              var text_29 = child(span_18, true);
              reset(span_18);
              reset(div_37);
              var node_19 = sibling(div_37, 2);
              {
                var consequent_14 = ($$anchor5) => {
                  var span_19 = root_30$1();
                  var text_30 = child(span_19, true);
                  reset(span_19);
                  template_effect(() => set_text(text_30, get(ev).subtitle));
                  append($$anchor5, span_19);
                };
                if_block(node_19, ($$render) => {
                  if (get(ev).subtitle) $$render(consequent_14);
                });
              }
              var node_20 = sibling(node_19, 2);
              {
                var consequent_15 = ($$anchor5) => {
                  var span_20 = root_31();
                  var text_31 = child(span_20, true);
                  reset(span_20);
                  template_effect(() => set_text(text_31, get(ev).location));
                  append($$anchor5, span_20);
                };
                if_block(node_20, ($$render) => {
                  if (get(ev).location) $$render(consequent_15);
                });
              }
              var div_38 = sibling(node_20, 2);
              var text_32 = child(div_38);
              var span_21 = sibling(text_32);
              var text_33 = child(span_21, true);
              reset(span_21);
              reset(div_38);
              var node_21 = sibling(div_38, 2);
              {
                var consequent_16 = ($$anchor5) => {
                  var div_39 = root_32$1();
                  each(div_39, 21, () => get(ev).tags, index, ($$anchor6, tag) => {
                    var span_22 = root_33$1();
                    var text_34 = child(span_22, true);
                    reset(span_22);
                    template_effect(() => set_text(text_34, get(tag)));
                    append($$anchor6, span_22);
                  });
                  reset(div_39);
                  append($$anchor5, div_39);
                };
                if_block(node_21, ($$render) => {
                  if (get(ev).tags?.length) $$render(consequent_16);
                });
              }
              reset(div_36);
              reset(div_35);
              template_effect(
                ($0, $1, $2, $3, $4, $5) => {
                  classes_7 = set_class(div_35, 1, "ag-card ag-card--plan svelte-n8lbn1", null, classes_7, {
                    "ag-card--first": get(i) === 0,
                    "ag-card--selected": selectedEventId() === get(ev).id,
                    "ag-card--cancelled": get(ev).status === "cancelled",
                    "ag-card--tentative": get(ev).status === "tentative",
                    "ag-card--full": get(ev).status === "full",
                    "ag-card--limited": get(ev).status === "limited"
                  });
                  set_attribute(div_35, "aria-label", `${get(ev).title ?? ""}${get(ev).status === "cancelled" ? " (cancelled)" : ""}${get(ev).status === "tentative" ? " (tentative)" : ""}${get(ev).status === "full" ? " (full)" : ""}${get(ev).status === "limited" ? " (limited)" : ""}, ${$0 ?? ""} to ${$1 ?? ""}, ${$2 ?? ""}`);
                  styles_8 = set_style(div_35, "", styles_8, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                  set_text(text_28, get(i) + 1);
                  set_text(text_29, get(ev).title);
                  set_text(text_32, `${$3 ?? ""} – ${$4 ?? ""} `);
                  set_text(text_33, $5);
                },
                [
                  () => fmt(get(ev).start),
                  () => fmt(get(ev).end),
                  () => duration(get(ev)),
                  () => fmt(get(ev).start),
                  () => fmt(get(ev).end),
                  () => duration(get(ev))
                ]
              );
              delegated("click", div_35, () => handleClick(get(ev)));
              event("pointerenter", div_35, () => get(oneventhover)?.(get(ev)));
              delegated("keydown", div_35, (e) => handleKeydown(e, get(ev)));
              append($$anchor4, div_35);
            });
            append($$anchor3, fragment_5);
          };
          if_block(node_17, ($$render) => {
            if (get(timedDayEvents).length === 0 && get(allDayBanner).length === 0) $$render(consequent_13);
            else $$render(alternate_4, -1);
          });
        }
        reset(div_33);
        append($$anchor2, div_33);
      };
      if_block(node_1, ($$render) => {
        if (get(compact)) $$render(consequent_4);
        else if (get(isToday)) $$render(consequent_10, 1);
        else if (get(isPastDay)) $$render(consequent_12, 2);
        else $$render(alternate_5, -1);
      });
    }
    reset(div_1);
    var node_22 = sibling(div_1, 2);
    {
      var consequent_17 = ($$anchor2) => {
        var div_40 = root_34();
        var text_35 = child(div_40, true);
        reset(div_40);
        template_effect(() => set_text(text_35, get(dateLabel)));
        append($$anchor2, div_40);
      };
      if_block(node_22, ($$render) => {
        if (!get(isMobile)) $$render(consequent_17);
      });
    }
    var node_23 = sibling(node_22, 2);
    {
      var consequent_18 = ($$anchor2) => {
        var nav = root_35$1();
        var button = child(nav);
        let classes_8;
        var text_36 = child(button, true);
        reset(button);
        var button_1 = sibling(button, 2);
        var button_2 = sibling(button_1, 2);
        reset(nav);
        template_effect(() => {
          set_attribute(nav, "aria-label", get(L).dayNavigation);
          classes_8 = set_class(button, 1, "ag-nav-pill ag-nav-today svelte-n8lbn1", null, classes_8, { "ag-nav-today--hidden": get(isToday) });
          set_attribute(button, "aria-label", get(L).goToToday);
          set_attribute(button, "tabindex", get(isToday) ? -1 : 0);
          set_text(text_36, get(L).today);
          set_attribute(button_1, "aria-label", get(L).previousDay);
          set_attribute(button_2, "aria-label", get(L).nextDay);
        });
        delegated("click", button, () => get(viewState)?.goToday());
        delegated("click", button_1, () => get(viewState)?.prev());
        delegated("click", button_2, () => get(viewState)?.next());
        append($$anchor2, nav);
      };
      if_block(node_23, ($$render) => {
        if (get(showNav) && !get(isMobile)) $$render(consequent_18);
      });
    }
    reset(div);
    template_effect(
      ($0) => {
        classes = set_class(div, 1, "ag ag--day svelte-n8lbn1", null, classes, $0);
        styles = set_style(div, style() || void 0, styles, { height: $$props.height ? `${$$props.height}px` : void 0 });
        set_attribute(div_1, "aria-label", get(L).todaysLineup);
      },
      [
        () => ({
          "ag--disabled": get(disabledSet).has(get(dayMs)),
          "ag--mobile": get(isMobile),
          "ag--auto": get(autoHeight)
        })
      ]
    );
    delegated("pointerdown", div, onPointerDown);
    delegated("pointerup", div, onPointerUp);
    append($$anchor, div);
    pop();
  }
  delegate(["pointerdown", "pointerup", "click", "keydown"]);
  var root_2$3 = /* @__PURE__ */ from_html(`<span class="ag-card-sub svelte-uhwfyj"> </span>`);
  var root_3$2 = /* @__PURE__ */ from_html(`<span class="ag-card-loc svelte-uhwfyj"> </span>`);
  var root_6$3 = /* @__PURE__ */ from_html(`<span class="ag-card-eta svelte-uhwfyj"> </span>`);
  var root_8$3 = /* @__PURE__ */ from_html(`<span class="ag-card-tag svelte-uhwfyj"> </span>`);
  var root_7$2 = /* @__PURE__ */ from_html(`<div class="ag-card-tags svelte-uhwfyj"></div>`);
  var root_9$1 = /* @__PURE__ */ from_html(`<div class="ag-card-progress svelte-uhwfyj"><div class="ag-card-progress-fill svelte-uhwfyj"></div></div>`);
  var root_1$2 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><div class="ag-card-body svelte-uhwfyj"><span class="ag-card-title svelte-uhwfyj"> </span> <!> <!> <span class="ag-card-meta svelte-uhwfyj"><!> <span class="ag-card-dur svelte-uhwfyj"> </span> <!></span> <!> <!></div></div>`);
  var root_12$1 = /* @__PURE__ */ from_html(`<span class="ag-wday-date svelte-uhwfyj"> </span>`);
  var root_13$2 = /* @__PURE__ */ from_html(`<div class="ag-wday-custom-header svelte-uhwfyj"><!></div>`);
  var root_11$2 = /* @__PURE__ */ from_html(`<div role="listitem"><div class="ag-wday-head svelte-uhwfyj"><div class="ag-wday-head-left svelte-uhwfyj"><span class="ag-wday-name svelte-uhwfyj"> </span> <!></div> <!></div></div>`);
  var root_15$1 = /* @__PURE__ */ from_html(`<span class="ag-wday-badge svelte-uhwfyj"> </span>`);
  var root_16$1 = /* @__PURE__ */ from_html(`<span class="ag-wday-badge ag-wday-badge--muted svelte-uhwfyj"> </span>`);
  var root_17$1 = /* @__PURE__ */ from_html(`<span class="ag-wday-date svelte-uhwfyj"> </span>`);
  var root_18 = /* @__PURE__ */ from_html(`<div class="ag-wday-custom-header svelte-uhwfyj"><!></div>`);
  var root_20 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="ag-allday-dot svelte-uhwfyj"></span> <span class="ag-allday-title svelte-uhwfyj"> </span></div>`);
  var root_19 = /* @__PURE__ */ from_html(`<div class="ag-allday svelte-uhwfyj"></div>`);
  var root_21 = /* @__PURE__ */ from_html(`<div class="ag-wday-empty svelte-uhwfyj"> </div>`);
  var root_24 = /* @__PURE__ */ from_html(`<span class="ag-compact-sub svelte-uhwfyj"> </span>`);
  var root_26 = /* @__PURE__ */ from_html(`<span class="ag-compact-tag svelte-uhwfyj"> </span>`);
  var root_23 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="ag-compact-dot svelte-uhwfyj"></span> <span class="ag-compact-time svelte-uhwfyj"> </span> <span class="ag-compact-title svelte-uhwfyj"> </span> <!> <!> <span class="ag-compact-dur svelte-uhwfyj"> </span></div>`);
  var root_22 = /* @__PURE__ */ from_html(`<div class="ag-wday-compact svelte-uhwfyj"></div>`);
  var root_28 = /* @__PURE__ */ from_html(`<div class="ag-wslot svelte-uhwfyj"><div></div></div>`);
  var root_27 = /* @__PURE__ */ from_html(`<div class="ag-wday-expanded svelte-uhwfyj"></div>`);
  var root_32 = /* @__PURE__ */ from_html(`<div class="ag-wslot svelte-uhwfyj"><div class="ag-wslot-header svelte-uhwfyj"><span class="ag-wslot-now svelte-uhwfyj"> </span></div> <!></div>`);
  var root_33 = /* @__PURE__ */ from_html(`<div class="ag-wslot svelte-uhwfyj"><div></div></div>`);
  var root_35 = /* @__PURE__ */ from_html(`<div class="ag-wday-past-line svelte-uhwfyj"> </div>`);
  var root_30 = /* @__PURE__ */ from_html(`<div class="ag-wday-expanded svelte-uhwfyj"><!> <!> <!></div>`);
  var root_38 = /* @__PURE__ */ from_html(`<span class="ag-compact-loc svelte-uhwfyj"> </span>`);
  var root_39 = /* @__PURE__ */ from_html(`<span class="ag-compact-sub svelte-uhwfyj"> </span>`);
  var root_41 = /* @__PURE__ */ from_html(`<span class="ag-compact-tag svelte-uhwfyj"> </span>`);
  var root_37 = /* @__PURE__ */ from_html(`<div role="button" tabindex="0"><span class="ag-compact-dot svelte-uhwfyj"></span> <span class="ag-compact-time svelte-uhwfyj"> </span> <span class="ag-compact-title svelte-uhwfyj"> </span> <!> <!> <!> <span class="ag-compact-dur svelte-uhwfyj"> </span></div>`);
  var root_42 = /* @__PURE__ */ from_html(`<div class="ag-compact-more svelte-uhwfyj"> </div>`);
  var root_36 = /* @__PURE__ */ from_html(`<div class="ag-wday-compact svelte-uhwfyj"><!> <!></div>`);
  var root_14$2 = /* @__PURE__ */ from_html(`<div role="listitem"><div class="ag-wday-head svelte-uhwfyj"><div class="ag-wday-head-left svelte-uhwfyj"><!> <span class="ag-wday-name svelte-uhwfyj"> </span> <!></div> <!></div> <!> <!></div>`);
  var root_43 = /* @__PURE__ */ from_html(`<nav class="ag-nav svelte-uhwfyj"><button> </button> <button class="ag-nav-pill svelte-uhwfyj"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M10 3 5 8l5 5"></path></svg></button> <button class="ag-nav-pill svelte-uhwfyj"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M6 3l5 5-5 5"></path></svg></button></nav>`);
  var root$2 = /* @__PURE__ */ from_html(`<div><div class="ag-body svelte-uhwfyj" role="list"></div> <!></div>`);
  function AgendaWeek($$anchor, $$props) {
    push($$props, true);
    const eventCard = ($$anchor2, ev = noop, isNow = noop, eta2 = noop) => {
      var div = root_1$2();
      let classes;
      let styles;
      var div_1 = child(div);
      var span = child(div_1);
      var text$1 = child(span, true);
      reset(span);
      var node = sibling(span, 2);
      {
        var consequent = ($$anchor3) => {
          var span_1 = root_2$3();
          var text_1 = child(span_1, true);
          reset(span_1);
          template_effect(() => set_text(text_1, ev().subtitle));
          append($$anchor3, span_1);
        };
        if_block(node, ($$render) => {
          if (ev().subtitle) $$render(consequent);
        });
      }
      var node_1 = sibling(node, 2);
      {
        var consequent_1 = ($$anchor3) => {
          var span_2 = root_3$2();
          var text_2 = child(span_2, true);
          reset(span_2);
          template_effect(() => set_text(text_2, ev().location));
          append($$anchor3, span_2);
        };
        if_block(node_1, ($$render) => {
          if (ev().location) $$render(consequent_1);
        });
      }
      var span_3 = sibling(node_1, 2);
      var node_2 = child(span_3);
      {
        var consequent_2 = ($$anchor3) => {
          var text_3 = text();
          template_effect(($0) => set_text(text_3, `${get(L).until ?? ""} ${$0 ?? ""}`), [() => fmt(ev().end)]);
          append($$anchor3, text_3);
        };
        var alternate = ($$anchor3) => {
          var text_4 = text();
          template_effect(($0, $1) => set_text(text_4, `${$0 ?? ""} – ${$1 ?? ""}`), [() => fmt(ev().start), () => fmt(ev().end)]);
          append($$anchor3, text_4);
        };
        if_block(node_2, ($$render) => {
          if (isNow()) $$render(consequent_2);
          else $$render(alternate, -1);
        });
      }
      var span_4 = sibling(node_2, 2);
      var text_5 = child(span_4, true);
      reset(span_4);
      var node_3 = sibling(span_4, 2);
      {
        var consequent_3 = ($$anchor3) => {
          var span_5 = root_6$3();
          var text_6 = child(span_5, true);
          reset(span_5);
          template_effect(() => set_text(text_6, eta2()));
          append($$anchor3, span_5);
        };
        if_block(node_3, ($$render) => {
          if (eta2()) $$render(consequent_3);
        });
      }
      reset(span_3);
      var node_4 = sibling(span_3, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var div_2 = root_7$2();
          each(div_2, 21, () => ev().tags, index, ($$anchor4, tag) => {
            var span_6 = root_8$3();
            var text_7 = child(span_6, true);
            reset(span_6);
            template_effect(() => set_text(text_7, get(tag)));
            append($$anchor4, span_6);
          });
          reset(div_2);
          append($$anchor3, div_2);
        };
        if_block(node_4, ($$render) => {
          if (ev().tags?.length) $$render(consequent_4);
        });
      }
      var node_5 = sibling(node_4, 2);
      {
        var consequent_5 = ($$anchor3) => {
          var div_3 = root_9$1();
          var div_4 = child(div_3);
          let styles_1;
          reset(div_3);
          template_effect(($0) => styles_1 = set_style(div_4, "", styles_1, $0), [() => ({ width: `${prog(ev()) * 100}%` })]);
          append($$anchor3, div_3);
        };
        if_block(node_5, ($$render) => {
          if (isNow()) $$render(consequent_5);
        });
      }
      reset(div_1);
      reset(div);
      template_effect(
        ($0, $1, $2, $3) => {
          classes = set_class(div, 1, "ag-card svelte-uhwfyj", null, classes, {
            "ag-card--selected": selectedEventId() === ev().id,
            "ag-card--cancelled": ev().status === "cancelled",
            "ag-card--tentative": ev().status === "tentative",
            "ag-card--full": ev().status === "full",
            "ag-card--limited": ev().status === "limited"
          });
          set_attribute(div, "aria-label", `${ev().title ?? ""}${ev().status === "cancelled" ? " (cancelled)" : ""}${ev().status === "tentative" ? " (tentative)" : ""}${ev().status === "full" ? " (full)" : ""}${ev().status === "limited" ? " (limited)" : ""}, ${$0 ?? ""} to ${$1 ?? ""}, ${$2 ?? ""}`);
          styles = set_style(div, "", styles, { "--ev-color": ev().color || "var(--dt-accent)" });
          set_text(text$1, ev().title);
          set_text(text_5, $3);
        },
        [
          () => fmt(ev().start),
          () => fmt(ev().end),
          () => duration(ev()),
          () => duration(ev())
        ]
      );
      delegated("click", div, () => handleClick(ev()));
      event("pointerenter", div, () => get(oneventhover)?.(ev()));
      delegated("keydown", div, (e) => handleKeydown(e, ev()));
      append($$anchor2, div);
    };
    const L = /* @__PURE__ */ user_derived(getLabels);
    const ctx = useCalendarContext();
    let mondayStart = prop($$props, "mondayStart", 3, true);
    prop($$props, "height", 3, 520);
    let events = prop($$props, "events", 19, () => []), style = prop($$props, "style", 3, ""), selectedEventId = prop($$props, "selectedEventId", 3, null);
    const clock = createClock();
    const viewState = /* @__PURE__ */ user_derived(() => ctx.viewState);
    const showNav = /* @__PURE__ */ user_derived(() => ctx.showNav);
    const equalDays = /* @__PURE__ */ user_derived(() => ctx.equalDays);
    const showDates = /* @__PURE__ */ user_derived(() => ctx.showDates);
    const hideDays = /* @__PURE__ */ user_derived(() => ctx.hideDays);
    const isMobile = /* @__PURE__ */ user_derived(() => ctx.isMobile);
    const autoHeight = /* @__PURE__ */ user_derived(() => ctx.autoHeight);
    const compact = /* @__PURE__ */ user_derived(() => ctx.compact);
    const dayHeaderSnippet = /* @__PURE__ */ user_derived(() => ctx.dayHeaderSnippet);
    const oneventhover = /* @__PURE__ */ user_derived(() => ctx.oneventhover);
    const disabledSet = /* @__PURE__ */ user_derived(() => ctx.disabledSet);
    let swipeStartX = 0;
    let swipeStartY = 0;
    const SWIPE_THRESHOLD = 50;
    function onPointerDown(e) {
      if (!get(isMobile)) return;
      swipeStartX = e.clientX;
      swipeStartY = e.clientY;
    }
    function onPointerUp(e) {
      if (!get(isMobile)) return;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx > 0) get(viewState)?.prev();
        else get(viewState)?.next();
      }
    }
    const fmt = (d) => fmtTime(d, $$props.locale);
    const eta = (ms) => timeUntilMs(ms, clock.tick);
    const prog = (ev) => progress(ev, clock.tick);
    function handleClick(ev) {
      $$props.oneventclick?.(ev);
    }
    function handleKeydown(e, ev) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        $$props.oneventclick?.(ev);
      }
    }
    const weekStartMs = /* @__PURE__ */ user_derived(() => $$props.focusDate ? get(viewState)?.dayCount === 7 ? startOfWeek(sod($$props.focusDate.getTime()), mondayStart()) : sod($$props.focusDate.getTime()) : get(viewState)?.dayCount === 7 ? startOfWeek(clock.today, mondayStart()) : clock.today);
    const customDays = /* @__PURE__ */ user_derived(() => get(viewState)?.dayCount ?? 7);
    const isThisWeek = /* @__PURE__ */ user_derived(() => get(customDays) === 7 ? get(weekStartMs) === startOfWeek(clock.today, mondayStart()) : clock.today >= get(weekStartMs) && clock.today < get(weekStartMs) + get(customDays) * DAY_MS);
    const weekDays = /* @__PURE__ */ user_derived(() => {
      const now = clock.tick;
      const todayMs = clock.today;
      const tomorrowMs = todayMs + DAY_MS;
      const out = [];
      for (let i = 0; i < get(customDays); i++) {
        const ms = get(weekStartMs) + i * DAY_MS;
        const dEnd = ms + DAY_MS;
        const dayEvts = events().filter((ev) => ev.start.getTime() < dEnd && ev.end.getTime() > ms).sort((a, b) => a.start.getTime() - b.start.getTime());
        const allDayEvts = dayEvts.filter((ev) => isAllDay(ev) || isMultiDay(ev));
        const timedEvts = dayEvts.filter((ev) => !isAllDay(ev) && !isMultiDay(ev));
        const totalMinutes = timedEvts.reduce(
          (sum, ev) => {
            const s = Math.max(ev.start.getTime(), ms);
            const e = Math.min(ev.end.getTime(), dEnd);
            return sum + (e - s) / 6e4;
          },
          0
        );
        const pastEvents = [];
        const currentEvents = [];
        const upcomingEvents = [];
        for (const ev of timedEvts) {
          if (ev.end.getTime() <= now) pastEvents.push(ev);
          else if (ev.start.getTime() <= now && ev.end.getTime() > now) currentEvents.push(ev);
          else upcomingEvents.push(ev);
        }
        let tier;
        if (get(equalDays)) {
          tier = "upcoming";
        } else if (ms === todayMs) {
          tier = "today";
        } else if (ms === tomorrowMs) {
          tier = "tomorrow";
        } else if (ms < todayMs) {
          tier = "past";
        } else {
          tier = "upcoming";
        }
        out.push({
          ms,
          dayName: weekdayLong(ms, $$props.locale),
          dateLabel: `${monthLong(ms, $$props.locale)} ${dayNum(ms)}`,
          tier,
          events: dayEvts,
          allDayEvents: allDayEvts,
          timedEvents: timedEvts,
          pastEvents,
          currentEvents,
          upcomingEvents,
          totalHours: Math.round(totalMinutes / 60 * 10) / 10
        });
      }
      if (get(hideDays)?.length) {
        return out.filter((d) => {
          const jsDay = new Date(d.ms).getDay();
          const iso = jsDay === 0 ? 7 : jsDay;
          return !get(hideDays).includes(iso);
        });
      }
      return out;
    });
    var div_5 = root$2();
    let classes_1;
    var div_6 = child(div_5);
    each(div_6, 21, () => get(weekDays), (day) => day.ms, ($$anchor2, day) => {
      const expanded = /* @__PURE__ */ user_derived(() => get(day).tier === "today" || get(day).tier === "tomorrow");
      var fragment_2 = comment();
      var node_6 = first_child(fragment_2);
      {
        var consequent_8 = ($$anchor3) => {
          var div_7 = root_11$2();
          let classes_2;
          var div_8 = child(div_7);
          var div_9 = child(div_8);
          var span_7 = child(div_9);
          var text_8 = child(span_7, true);
          reset(span_7);
          var node_7 = sibling(span_7, 2);
          {
            var consequent_6 = ($$anchor4) => {
              var span_8 = root_12$1();
              var text_9 = child(span_8, true);
              reset(span_8);
              template_effect(() => set_text(text_9, get(day).dateLabel));
              append($$anchor4, span_8);
            };
            if_block(node_7, ($$render) => {
              if (get(showDates)) $$render(consequent_6);
            });
          }
          reset(div_9);
          var node_8 = sibling(div_9, 2);
          {
            var consequent_7 = ($$anchor4) => {
              var div_10 = root_13$2();
              var node_9 = child(div_10);
              snippet(node_9, () => get(dayHeaderSnippet), () => ({
                date: new Date(get(day).ms),
                isToday: false,
                dayName: get(day).dayName
              }));
              reset(div_10);
              append($$anchor4, div_10);
            };
            if_block(node_8, ($$render) => {
              if (get(dayHeaderSnippet)) $$render(consequent_7);
            });
          }
          reset(div_8);
          reset(div_7);
          template_effect(
            ($0) => {
              classes_2 = set_class(div_7, 1, "ag-wday ag-wday--past svelte-uhwfyj", null, classes_2, $0);
              set_text(text_8, get(day).dayName);
            },
            [
              () => ({ "ag-wday--disabled": get(disabledSet).has(get(day).ms) })
            ]
          );
          append($$anchor3, div_7);
        };
        var alternate_2 = ($$anchor3) => {
          var div_11 = root_14$2();
          let classes_3;
          var div_12 = child(div_11);
          var div_13 = child(div_12);
          var node_10 = child(div_13);
          {
            var consequent_9 = ($$anchor4) => {
              var span_9 = root_15$1();
              var text_10 = child(span_9, true);
              reset(span_9);
              template_effect(() => set_text(text_10, get(L).today));
              append($$anchor4, span_9);
            };
            var consequent_10 = ($$anchor4) => {
              var span_10 = root_16$1();
              var text_11 = child(span_10, true);
              reset(span_10);
              template_effect(() => set_text(text_11, get(L).tomorrow));
              append($$anchor4, span_10);
            };
            if_block(node_10, ($$render) => {
              if (get(day).tier === "today") $$render(consequent_9);
              else if (get(day).tier === "tomorrow") $$render(consequent_10, 1);
            });
          }
          var span_11 = sibling(node_10, 2);
          var text_12 = child(span_11, true);
          reset(span_11);
          var node_11 = sibling(span_11, 2);
          {
            var consequent_11 = ($$anchor4) => {
              var span_12 = root_17$1();
              var text_13 = child(span_12, true);
              reset(span_12);
              template_effect(() => set_text(text_13, get(day).dateLabel));
              append($$anchor4, span_12);
            };
            if_block(node_11, ($$render) => {
              if (get(showDates)) $$render(consequent_11);
            });
          }
          reset(div_13);
          var node_12 = sibling(div_13, 2);
          {
            var consequent_12 = ($$anchor4) => {
              var div_14 = root_18();
              var node_13 = child(div_14);
              snippet(node_13, () => get(dayHeaderSnippet), () => ({
                date: new Date(get(day).ms),
                isToday: get(day).tier === "today",
                dayName: get(day).dayName
              }));
              reset(div_14);
              append($$anchor4, div_14);
            };
            if_block(node_12, ($$render) => {
              if (get(dayHeaderSnippet)) $$render(consequent_12);
            });
          }
          reset(div_12);
          var node_14 = sibling(div_12, 2);
          {
            var consequent_13 = ($$anchor4) => {
              var div_15 = root_19();
              each(div_15, 21, () => get(day).allDayEvents, (ev) => ev.id, ($$anchor5, ev) => {
                var div_16 = root_20();
                let classes_4;
                let styles_2;
                var span_13 = sibling(child(div_16), 2);
                var text_14 = child(span_13, true);
                reset(span_13);
                reset(div_16);
                template_effect(() => {
                  classes_4 = set_class(div_16, 1, "ag-allday-chip svelte-uhwfyj", null, classes_4, {
                    "ag-allday-chip--selected": selectedEventId() === get(ev).id
                  });
                  set_attribute(div_16, "aria-label", `${get(ev).title ?? ""}, ${get(L).allDay ?? ""}`);
                  styles_2 = set_style(div_16, "", styles_2, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                  set_text(text_14, get(ev).title);
                });
                delegated("click", div_16, () => handleClick(get(ev)));
                event("pointerenter", div_16, () => get(oneventhover)?.(get(ev)));
                delegated("keydown", div_16, (e) => handleKeydown(e, get(ev)));
                append($$anchor5, div_16);
              });
              reset(div_15);
              append($$anchor4, div_15);
            };
            if_block(node_14, ($$render) => {
              if (get(day).allDayEvents.length > 0) $$render(consequent_13);
            });
          }
          var node_15 = sibling(node_14, 2);
          {
            var consequent_14 = ($$anchor4) => {
              var div_17 = root_21();
              var text_15 = child(div_17, true);
              reset(div_17);
              template_effect(() => set_text(text_15, get(L).noEvents));
              append($$anchor4, div_17);
            };
            var consequent_17 = ($$anchor4) => {
              var div_18 = root_22();
              each(div_18, 21, () => get(day).timedEvents, (ev) => ev.id, ($$anchor5, ev) => {
                var div_19 = root_23();
                let classes_5;
                let styles_3;
                var span_14 = sibling(child(div_19), 2);
                var text_16 = child(span_14, true);
                reset(span_14);
                var span_15 = sibling(span_14, 2);
                var text_17 = child(span_15, true);
                reset(span_15);
                var node_16 = sibling(span_15, 2);
                {
                  var consequent_15 = ($$anchor6) => {
                    var span_16 = root_24();
                    var text_18 = child(span_16, true);
                    reset(span_16);
                    template_effect(() => set_text(text_18, get(ev).subtitle));
                    append($$anchor6, span_16);
                  };
                  if_block(node_16, ($$render) => {
                    if (get(ev).subtitle) $$render(consequent_15);
                  });
                }
                var node_17 = sibling(node_16, 2);
                {
                  var consequent_16 = ($$anchor6) => {
                    var fragment_3 = comment();
                    var node_18 = first_child(fragment_3);
                    each(node_18, 17, () => get(ev).tags, index, ($$anchor7, tag) => {
                      var span_17 = root_26();
                      var text_19 = child(span_17, true);
                      reset(span_17);
                      template_effect(() => set_text(text_19, get(tag)));
                      append($$anchor7, span_17);
                    });
                    append($$anchor6, fragment_3);
                  };
                  if_block(node_17, ($$render) => {
                    if (get(ev).tags?.length) $$render(consequent_16);
                  });
                }
                var span_18 = sibling(node_17, 2);
                var text_20 = child(span_18, true);
                reset(span_18);
                reset(div_19);
                template_effect(
                  ($0, $1, $2, $3) => {
                    classes_5 = set_class(div_19, 1, "ag-compact svelte-uhwfyj", null, classes_5, {
                      "ag-compact--selected": selectedEventId() === get(ev).id,
                      "ag-compact--cancelled": get(ev).status === "cancelled",
                      "ag-compact--tentative": get(ev).status === "tentative",
                      "ag-compact--full": get(ev).status === "full",
                      "ag-compact--limited": get(ev).status === "limited"
                    });
                    set_attribute(div_19, "aria-label", `${get(ev).title ?? ""}, ${$0 ?? ""}, ${$1 ?? ""}`);
                    styles_3 = set_style(div_19, "", styles_3, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                    set_text(text_16, $2);
                    set_text(text_17, get(ev).title);
                    set_text(text_20, $3);
                  },
                  [
                    () => fmt(get(ev).start),
                    () => duration(get(ev)),
                    () => fmt(get(ev).start),
                    () => duration(get(ev))
                  ]
                );
                delegated("click", div_19, () => handleClick(get(ev)));
                event("pointerenter", div_19, () => get(oneventhover)?.(get(ev)));
                delegated("keydown", div_19, (e) => handleKeydown(e, get(ev)));
                append($$anchor5, div_19);
              });
              reset(div_18);
              append($$anchor4, div_18);
            };
            var consequent_18 = ($$anchor4) => {
              var div_20 = root_27();
              each(div_20, 21, () => groupIntoSlots(get(day).timedEvents), (slot) => slot.startMs, ($$anchor5, slot) => {
                var div_21 = root_28();
                var div_22 = child(div_21);
                let classes_6;
                each(div_22, 21, () => get(slot).events, (ev) => ev.id, ($$anchor6, ev) => {
                  eventCard($$anchor6, () => get(ev), () => false);
                });
                reset(div_22);
                reset(div_21);
                template_effect(() => classes_6 = set_class(div_22, 1, "ag-wslot-cards svelte-uhwfyj", null, classes_6, { "ag-wslot-cards--multi": get(slot).events.length > 1 }));
                append($$anchor5, div_21);
              });
              reset(div_20);
              append($$anchor4, div_20);
            };
            var consequent_21 = ($$anchor4) => {
              var div_23 = root_30();
              var node_19 = child(div_23);
              {
                var consequent_19 = ($$anchor5) => {
                  var fragment_5 = comment();
                  var node_20 = first_child(fragment_5);
                  each(node_20, 17, () => get(day).currentEvents, (ev) => ev.id, ($$anchor6, ev) => {
                    var div_24 = root_32();
                    var div_25 = child(div_24);
                    var span_19 = child(div_25);
                    var text_21 = child(span_19, true);
                    reset(span_19);
                    reset(div_25);
                    var node_21 = sibling(div_25, 2);
                    eventCard(node_21, () => get(ev), () => true);
                    reset(div_24);
                    template_effect(() => set_text(text_21, get(L).now));
                    append($$anchor6, div_24);
                  });
                  append($$anchor5, fragment_5);
                };
                if_block(node_19, ($$render) => {
                  if (get(day).currentEvents.length > 0) $$render(consequent_19);
                });
              }
              var node_22 = sibling(node_19, 2);
              each(node_22, 17, () => groupIntoSlots(get(day).upcomingEvents), (slot) => slot.startMs, ($$anchor5, slot) => {
                var div_26 = root_33();
                var div_27 = child(div_26);
                let classes_7;
                each(div_27, 21, () => get(slot).events, (ev) => ev.id, ($$anchor6, ev) => {
                  {
                    let $0 = /* @__PURE__ */ user_derived(() => get(day).tier === "today" ? eta(get(ev).start.getTime()) : void 0);
                    eventCard($$anchor6, () => get(ev), () => false, () => get($0));
                  }
                });
                reset(div_27);
                reset(div_26);
                template_effect(() => classes_7 = set_class(div_27, 1, "ag-wslot-cards svelte-uhwfyj", null, classes_7, { "ag-wslot-cards--multi": get(slot).events.length > 1 }));
                append($$anchor5, div_26);
              });
              var node_23 = sibling(node_22, 2);
              {
                var consequent_20 = ($$anchor5) => {
                  var div_28 = root_35();
                  var text_22 = child(div_28);
                  reset(div_28);
                  template_effect(($0) => set_text(text_22, `✓ ${$0 ?? ""}`), [() => get(L).nCompleted(get(day).pastEvents.length)]);
                  append($$anchor5, div_28);
                };
                if_block(node_23, ($$render) => {
                  if (get(day).pastEvents.length > 0) $$render(consequent_20);
                });
              }
              reset(div_23);
              append($$anchor4, div_23);
            };
            var alternate_1 = ($$anchor4) => {
              var div_29 = root_36();
              var node_24 = child(div_29);
              each(node_24, 17, () => get(day).timedEvents.slice(0, 4), (ev) => ev.id, ($$anchor5, ev) => {
                var div_30 = root_37();
                let classes_8;
                let styles_4;
                var span_20 = sibling(child(div_30), 2);
                var text_23 = child(span_20, true);
                reset(span_20);
                var span_21 = sibling(span_20, 2);
                var text_24 = child(span_21, true);
                reset(span_21);
                var node_25 = sibling(span_21, 2);
                {
                  var consequent_22 = ($$anchor6) => {
                    var span_22 = root_38();
                    var text_25 = child(span_22, true);
                    reset(span_22);
                    template_effect(() => set_text(text_25, get(ev).location));
                    append($$anchor6, span_22);
                  };
                  if_block(node_25, ($$render) => {
                    if (get(ev).location) $$render(consequent_22);
                  });
                }
                var node_26 = sibling(node_25, 2);
                {
                  var consequent_23 = ($$anchor6) => {
                    var span_23 = root_39();
                    var text_26 = child(span_23, true);
                    reset(span_23);
                    template_effect(() => set_text(text_26, get(ev).subtitle));
                    append($$anchor6, span_23);
                  };
                  if_block(node_26, ($$render) => {
                    if (get(ev).subtitle) $$render(consequent_23);
                  });
                }
                var node_27 = sibling(node_26, 2);
                {
                  var consequent_24 = ($$anchor6) => {
                    var fragment_7 = comment();
                    var node_28 = first_child(fragment_7);
                    each(node_28, 17, () => get(ev).tags, index, ($$anchor7, tag) => {
                      var span_24 = root_41();
                      var text_27 = child(span_24, true);
                      reset(span_24);
                      template_effect(() => set_text(text_27, get(tag)));
                      append($$anchor7, span_24);
                    });
                    append($$anchor6, fragment_7);
                  };
                  if_block(node_27, ($$render) => {
                    if (get(ev).tags?.length) $$render(consequent_24);
                  });
                }
                var span_25 = sibling(node_27, 2);
                var text_28 = child(span_25, true);
                reset(span_25);
                reset(div_30);
                template_effect(
                  ($0, $1, $2, $3) => {
                    classes_8 = set_class(div_30, 1, "ag-compact svelte-uhwfyj", null, classes_8, {
                      "ag-compact--selected": selectedEventId() === get(ev).id,
                      "ag-compact--cancelled": get(ev).status === "cancelled",
                      "ag-compact--tentative": get(ev).status === "tentative",
                      "ag-compact--full": get(ev).status === "full",
                      "ag-compact--limited": get(ev).status === "limited"
                    });
                    set_attribute(div_30, "aria-label", `${get(ev).title ?? ""}, ${$0 ?? ""}, ${$1 ?? ""}`);
                    styles_4 = set_style(div_30, "", styles_4, { "--ev-color": get(ev).color || "var(--dt-accent)" });
                    set_text(text_23, $2);
                    set_text(text_24, get(ev).title);
                    set_text(text_28, $3);
                  },
                  [
                    () => fmt(get(ev).start),
                    () => duration(get(ev)),
                    () => fmt(get(ev).start),
                    () => duration(get(ev))
                  ]
                );
                delegated("click", div_30, () => handleClick(get(ev)));
                event("pointerenter", div_30, () => get(oneventhover)?.(get(ev)));
                delegated("keydown", div_30, (e) => handleKeydown(e, get(ev)));
                append($$anchor5, div_30);
              });
              var node_29 = sibling(node_24, 2);
              {
                var consequent_25 = ($$anchor5) => {
                  var div_31 = root_42();
                  var text_29 = child(div_31, true);
                  reset(div_31);
                  template_effect(($0) => set_text(text_29, $0), [() => get(L).nMore(get(day).timedEvents.length - 4)]);
                  append($$anchor5, div_31);
                };
                if_block(node_29, ($$render) => {
                  if (get(day).timedEvents.length > 4) $$render(consequent_25);
                });
              }
              reset(div_29);
              append($$anchor4, div_29);
            };
            if_block(node_15, ($$render) => {
              if (get(day).events.length === 0) $$render(consequent_14);
              else if (get(compact)) $$render(consequent_17, 1);
              else if (get(equalDays)) $$render(consequent_18, 2);
              else if (get(expanded)) $$render(consequent_21, 3);
              else $$render(alternate_1, -1);
            });
          }
          reset(div_11);
          template_effect(
            ($0) => {
              classes_3 = set_class(div_11, 1, "ag-wday svelte-uhwfyj", null, classes_3, $0);
              set_text(text_12, get(day).dayName);
            },
            [
              () => ({
                "ag-wday--today": get(day).tier === "today",
                "ag-wday--tomorrow": get(day).tier === "tomorrow",
                "ag-wday--equal": get(equalDays),
                "ag-wday--disabled": get(disabledSet).has(get(day).ms)
              })
            ]
          );
          append($$anchor3, div_11);
        };
        if_block(node_6, ($$render) => {
          if (get(day).tier === "past") $$render(consequent_8);
          else $$render(alternate_2, -1);
        });
      }
      append($$anchor2, fragment_2);
    });
    reset(div_6);
    var node_30 = sibling(div_6, 2);
    {
      var consequent_26 = ($$anchor2) => {
        var nav = root_43();
        var button = child(nav);
        let classes_9;
        var text_30 = child(button, true);
        reset(button);
        var button_1 = sibling(button, 2);
        var button_2 = sibling(button_1, 2);
        reset(nav);
        template_effect(() => {
          set_attribute(nav, "aria-label", get(L).weekNavigation);
          classes_9 = set_class(button, 1, "ag-nav-pill ag-nav-today svelte-uhwfyj", null, classes_9, { "ag-nav-today--hidden": get(isThisWeek) });
          set_attribute(button, "aria-label", get(L).goToToday);
          set_attribute(button, "tabindex", get(isThisWeek) ? -1 : 0);
          set_text(text_30, get(L).today);
          set_attribute(button_1, "aria-label", get(L).previousWeek);
          set_attribute(button_2, "aria-label", get(L).nextWeek);
        });
        delegated("click", button, () => get(viewState)?.goToday());
        delegated("click", button_1, () => get(viewState)?.prev());
        delegated("click", button_2, () => get(viewState)?.next());
        append($$anchor2, nav);
      };
      if_block(node_30, ($$render) => {
        if (get(showNav) && !get(isMobile)) $$render(consequent_26);
      });
    }
    reset(div_5);
    template_effect(() => {
      classes_1 = set_class(div_5, 1, "ag ag--week svelte-uhwfyj", null, classes_1, { "ag--mobile": get(isMobile), "ag--auto": get(autoHeight) });
      set_style(div_5, style() || void 0);
      set_attribute(div_6, "aria-label", get(L).weekAhead);
    });
    delegated("pointerdown", div_5, onPointerDown);
    delegated("pointerup", div_5, onPointerUp);
    append($$anchor, div_5);
    pop();
  }
  delegate(["click", "keydown", "pointerdown", "pointerup"]);
  function Agenda($$anchor, $$props) {
    let mode = prop($$props, "mode", 3, "day"), rest = /* @__PURE__ */ rest_props($$props, ["$$slots", "$$events", "$$legacy", "mode"]);
    var fragment = comment();
    var node = first_child(fragment);
    {
      var consequent = ($$anchor2) => {
        AgendaDay($$anchor2, spread_props(() => rest));
      };
      var alternate = ($$anchor2) => {
        AgendaWeek($$anchor2, spread_props(() => rest));
      };
      if_block(node, ($$render) => {
        if (mode() === "day") $$render(consequent);
        else $$render(alternate, -1);
      });
    }
    append($$anchor, fragment);
  }
  var root_4$2 = /* @__PURE__ */ from_html(`<span class="mb-allday-span svelte-zbkzcp"> </span>`);
  var root_3$1 = /* @__PURE__ */ from_html(`<button><span class="mb-allday-dot svelte-zbkzcp"></span> <span class="mb-allday-title svelte-zbkzcp"> </span> <!></button>`);
  var root_5$2 = /* @__PURE__ */ from_html(`<span class="mb-allday-more svelte-zbkzcp"> </span>`);
  var root_2$2 = /* @__PURE__ */ from_html(`<div class="mb-allday svelte-zbkzcp"><!> <!></div>`);
  var root_8$2 = /* @__PURE__ */ from_html(`<span class="mb-blocked-label svelte-zbkzcp"> </span>`);
  var root_6$2 = /* @__PURE__ */ from_html(`<div><div class="mb-hour-label svelte-zbkzcp"> </div> <div class="mb-hour-line svelte-zbkzcp"></div> <!></div>`);
  var root_9 = /* @__PURE__ */ from_html(`<div class="mb-now svelte-zbkzcp"><span class="mb-now-label svelte-zbkzcp"> </span> <div class="mb-now-line svelte-zbkzcp"></div></div>`);
  var root_11$1 = /* @__PURE__ */ from_html(`<span class="mb-ev-time svelte-zbkzcp"> </span>`);
  var root_12 = /* @__PURE__ */ from_html(`<span class="mb-ev-sub svelte-zbkzcp"> </span>`);
  var root_13$1 = /* @__PURE__ */ from_html(`<span class="mb-ev-loc svelte-zbkzcp"> </span>`);
  var root_15 = /* @__PURE__ */ from_html(`<span class="mb-ev-tag svelte-zbkzcp"> </span>`);
  var root_14$1 = /* @__PURE__ */ from_html(`<div class="mb-ev-tags svelte-zbkzcp"></div>`);
  var root_16 = /* @__PURE__ */ from_html(`<span class="mb-ev-live svelte-zbkzcp"></span>`);
  var root_17 = /* @__PURE__ */ from_html(`<span class="mb-ev-next-badge svelte-zbkzcp"> </span>`);
  var root_10$1 = /* @__PURE__ */ from_html(`<button><div class="mb-ev-stripe svelte-zbkzcp"></div> <div class="mb-ev-body svelte-zbkzcp"><span class="mb-ev-title svelte-zbkzcp"> </span> <!> <!> <!> <!></div> <!></button>`);
  var root_1$1 = /* @__PURE__ */ from_html(`<div role="region"><!> <div class="mb-grid svelte-zbkzcp" role="grid" tabindex="-1"><div class="mb-grid-inner svelte-zbkzcp"><!> <!> <!></div></div></div>`);
  function MobileDay($$anchor, $$props) {
    push($$props, true);
    const L = /* @__PURE__ */ user_derived(getLabels);
    let height = prop($$props, "height", 3, null), events = prop($$props, "events", 19, () => []), style = prop($$props, "style", 3, ""), selectedEventId = prop($$props, "selectedEventId", 3, null), readOnly = prop($$props, "readOnly", 3, false);
    const ctx = useCalendarContext();
    const viewState = /* @__PURE__ */ user_derived(() => ctx.viewState);
    const autoHeight = /* @__PURE__ */ user_derived(() => ctx.autoHeight);
    const oneventhover = /* @__PURE__ */ user_derived(() => ctx.oneventhover);
    const disabledSet = /* @__PURE__ */ user_derived(() => ctx.disabledSet);
    const loadRangeCtx = /* @__PURE__ */ user_derived(() => ctx.loadRange);
    const minDuration = /* @__PURE__ */ user_derived(() => ctx.minDuration);
    const blockedSlots = /* @__PURE__ */ user_derived(() => ctx.blockedSlots);
    const clock = createClock();
    const HOUR_HEIGHT = 64;
    const GUTTER_W = 40;
    const startHour = /* @__PURE__ */ user_derived(() => $$props.visibleHours?.[0] ?? 0);
    const endHour = /* @__PURE__ */ user_derived(() => $$props.visibleHours?.[1] ?? 24);
    const hourCount = /* @__PURE__ */ user_derived(() => Math.max(1, get(endHour) - get(startHour)));
    const gridHeight = /* @__PURE__ */ user_derived(() => get(hourCount) * HOUR_HEIGHT);
    const dayMs = /* @__PURE__ */ user_derived(() => $$props.focusDate ? sod($$props.focusDate.getTime()) : clock.today);
    const dayEnd = /* @__PURE__ */ user_derived(() => get(dayMs) + DAY_MS);
    const isToday = /* @__PURE__ */ user_derived(() => get(dayMs) === clock.today);
    const isDisabled = /* @__PURE__ */ user_derived(() => get(disabledSet).has(get(dayMs)));
    user_effect(() => {
      if (!get(loadRangeCtx)) return;
      const rangeStart = new Date(get(dayMs) - 2 * DAY_MS);
      const rangeEnd = new Date(get(dayMs) + 3 * DAY_MS);
      get(loadRangeCtx).set({ start: rangeStart, end: rangeEnd });
      return () => get(loadRangeCtx).set(null);
    });
    const timedEvents = /* @__PURE__ */ user_derived(() => events().filter((ev) => !isAllDay(ev) && !isMultiDay(ev) && ev.start.getTime() < get(dayEnd) && ev.end.getTime() > get(dayMs)).sort((a, b) => a.start.getTime() - b.start.getTime()));
    const allDayEvents = /* @__PURE__ */ user_derived(() => {
      const segs = [];
      for (const ev of events()) {
        if (!isAllDay(ev) && !isMultiDay(ev)) continue;
        const seg = segmentForDay(ev, get(dayMs));
        if (seg) segs.push(seg);
      }
      return segs;
    });
    const positionedEvents = /* @__PURE__ */ user_derived(() => {
      const now = clock.tick;
      const sorted = [...get(timedEvents)];
      let nextEventId = null;
      if (get(isToday)) {
        for (const ev of [...sorted].sort((a, b) => a.start.getTime() - b.start.getTime())) {
          const s = ev.start.getTime();
          if (s > now) {
            nextEventId = ev.id;
            break;
          }
        }
      }
      const infos = sorted.map((ev) => {
        const sMs = Math.max(ev.start.getTime(), get(dayMs) + get(startHour) * HOUR_MS);
        const eMs = Math.min(ev.end.getTime(), get(dayMs) + get(endHour) * HOUR_MS);
        const topH = (sMs - get(dayMs)) / HOUR_MS - get(startHour);
        const botH = (eMs - get(dayMs)) / HOUR_MS - get(startHour);
        return {
          ev,
          top: topH * HOUR_HEIGHT,
          height: Math.max(24, (botH - topH) * HOUR_HEIGHT),
          isCurrent: ev.start.getTime() <= now && ev.end.getTime() > now,
          isNext: ev.id === nextEventId,
          startMs: sMs,
          endMs: eMs,
          col: 0,
          totalCols: 1
        };
      });
      const par = infos.map((_, i) => i);
      function find(i) {
        while (par[i] !== i) {
          par[i] = par[par[i]];
          i = par[i];
        }
        return i;
      }
      for (let i = 0; i < infos.length; i++) {
        for (let j = i + 1; j < infos.length; j++) {
          if (infos[j].startMs < infos[i].endMs) par[find(i)] = find(j);
          else break;
        }
      }
      const groups = /* @__PURE__ */ new Map();
      for (let i = 0; i < infos.length; i++) {
        const root2 = find(i);
        if (!groups.has(root2)) groups.set(root2, []);
        groups.get(root2).push(i);
      }
      for (const [, indices] of groups) {
        const rows = [];
        for (const idx of indices) {
          let row = 0;
          for (let r = 0; r < rows.length; r++) {
            if (rows[r] <= infos[idx].startMs) {
              row = r;
              rows[r] = infos[idx].endMs;
              break;
            }
            row = r + 1;
          }
          if (row >= rows.length) rows.push(infos[idx].endMs);
          infos[idx].col = row;
        }
        for (const idx of indices) infos[idx].totalCols = rows.length;
      }
      return infos.map((info) => ({
        ev: info.ev,
        top: info.top,
        height: info.height,
        left: `calc(${GUTTER_W}px + ${info.col / info.totalCols * 100}% - ${GUTTER_W * info.col / info.totalCols}px)`,
        width: `calc(${100 / info.totalCols}% - ${GUTTER_W / info.totalCols + 2}px)`,
        isCurrent: info.isCurrent,
        isNext: info.isNext,
        col: info.col,
        totalCols: info.totalCols
      }));
    });
    const nowOffset = /* @__PURE__ */ user_derived(() => {
      if (!get(isToday)) return -1;
      const h = (clock.tick - get(dayMs)) / HOUR_MS - get(startHour);
      if (h < 0 || h > get(hourCount)) return -1;
      return h * HOUR_HEIGHT;
    });
    function isBlockedAt(hour) {
      if (!get(blockedSlots)?.length) return false;
      const jsDay = new Date(get(dayMs)).getDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      return get(blockedSlots).some((slot) => {
        if (slot.day && slot.day !== isoDay) return false;
        return hour >= slot.start && hour < slot.end;
      });
    }
    let touchStartX = 0;
    let touchStartY = 0;
    let swiping = false;
    let swipeOffset = /* @__PURE__ */ state(0);
    const SWIPE_THRESHOLD = 50;
    function onTouchStart(e) {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      swiping = true;
      set(swipeOffset, 0);
    }
    function onTouchMove(e) {
      if (!swiping) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dy) > Math.abs(dx) * 0.8) {
        swiping = false;
        return;
      }
      set(swipeOffset, dx);
    }
    function onTouchEnd() {
      if (!swiping) {
        set(swipeOffset, 0);
        return;
      }
      if (Math.abs(get(swipeOffset)) > SWIPE_THRESHOLD) {
        if (get(swipeOffset) > 0) {
          get(viewState)?.prev();
        } else {
          get(viewState)?.next();
        }
      }
      set(swipeOffset, 0);
      swiping = false;
    }
    function handleGridClick(e) {
      if (!$$props.oneventcreate || readOnly() || get(isDisabled)) return;
      if (e.target.closest(".mb-event")) return;
      const grid = e.currentTarget;
      const rect = grid.getBoundingClientRect();
      const y = e.clientY - rect.top + grid.scrollTop;
      const hour = get(startHour) + y / HOUR_HEIGHT;
      if (isBlockedAt(hour)) return;
      const snapHour = Math.floor(hour);
      const durMin = get(minDuration) ? Math.max(60, get(minDuration)) : 60;
      const start = new Date(get(dayMs) + snapHour * HOUR_MS);
      const end = new Date(start.getTime() + durMin * 6e4);
      $$props.oneventcreate({ start, end });
    }
    let gridEl;
    onMount(() => {
      if (get(nowOffset) > 0 && gridEl) {
        const scrollTarget = Math.max(0, get(nowOffset) - 120);
        gridEl.scrollTop = scrollTarget;
      }
    });
    var div = root_1$1();
    let classes;
    let styles;
    var node = child(div);
    {
      var consequent_2 = ($$anchor2) => {
        var div_1 = root_2$2();
        var node_1 = child(div_1);
        each(node_1, 17, () => get(allDayEvents).slice(0, 3), (seg) => seg.ev.id, ($$anchor3, seg) => {
          var button = root_3$1();
          let classes_1;
          let styles_1;
          var span = sibling(child(button), 2);
          var text2 = child(span, true);
          reset(span);
          var node_2 = sibling(span, 2);
          {
            var consequent = ($$anchor4) => {
              var span_1 = root_4$2();
              var text_1 = child(span_1);
              reset(span_1);
              template_effect(() => set_text(text_1, `${get(seg).dayIndex ?? ""}/${get(seg).totalDays ?? ""}`));
              append($$anchor4, span_1);
            };
            if_block(node_2, ($$render) => {
              if (get(seg).totalDays > 1) $$render(consequent);
            });
          }
          reset(button);
          template_effect(() => {
            classes_1 = set_class(button, 1, "mb-allday-chip svelte-zbkzcp", null, classes_1, {
              "mb-allday-chip--selected": selectedEventId() === get(seg).ev.id
            });
            styles_1 = set_style(button, "", styles_1, { "--ev-color": get(seg).ev.color ?? "var(--dt-accent)" });
            set_text(text2, get(seg).ev.title);
          });
          delegated("click", button, () => $$props.oneventclick?.(get(seg).ev));
          append($$anchor3, button);
        });
        var node_3 = sibling(node_1, 2);
        {
          var consequent_1 = ($$anchor3) => {
            var span_2 = root_5$2();
            var text_2 = child(span_2, true);
            reset(span_2);
            template_effect(($0) => set_text(text_2, $0), [() => get(L).nMore(get(allDayEvents).length - 3)]);
            append($$anchor3, span_2);
          };
          if_block(node_3, ($$render) => {
            if (get(allDayEvents).length > 3) $$render(consequent_1);
          });
        }
        reset(div_1);
        append($$anchor2, div_1);
      };
      if_block(node, ($$render) => {
        if (get(allDayEvents).length > 0) $$render(consequent_2);
      });
    }
    var div_2 = sibling(node, 2);
    var div_3 = child(div_2);
    let styles_2;
    var node_4 = child(div_3);
    each(node_4, 17, () => ({ length: get(hourCount) }), index, ($$anchor2, _, h) => {
      const hour = /* @__PURE__ */ user_derived(() => get(startHour) + h);
      const blocked = /* @__PURE__ */ user_derived(() => isBlockedAt(get(hour)));
      var div_4 = root_6$2();
      let classes_2;
      set_style(div_4, "", {}, { top: `${h * HOUR_HEIGHT}px`, height: "64px" });
      var div_5 = child(div_4);
      var text_3 = child(div_5, true);
      reset(div_5);
      var node_5 = sibling(div_5, 4);
      {
        var consequent_4 = ($$anchor3) => {
          const slot = /* @__PURE__ */ user_derived(() => get(blockedSlots).find((s) => (!s.day || s.day === (new Date(get(dayMs)).getDay() === 0 ? 7 : new Date(get(dayMs)).getDay())) && get(hour) >= s.start && get(hour) < s.end));
          var fragment = comment();
          var node_6 = first_child(fragment);
          {
            var consequent_3 = ($$anchor4) => {
              var span_3 = root_8$2();
              var text_4 = child(span_3, true);
              reset(span_3);
              template_effect(() => set_text(text_4, get(slot).label));
              append($$anchor4, span_3);
            };
            if_block(node_6, ($$render) => {
              if (get(slot)?.label) $$render(consequent_3);
            });
          }
          append($$anchor3, fragment);
        };
        if_block(node_5, ($$render) => {
          if (get(blocked) && get(blockedSlots)) $$render(consequent_4);
        });
      }
      reset(div_4);
      template_effect(
        ($0) => {
          classes_2 = set_class(div_4, 1, "mb-hour svelte-zbkzcp", null, classes_2, { "mb-hour--blocked": get(blocked) });
          set_text(text_3, $0);
        },
        [() => fmtH(get(hour), $$props.locale)]
      );
      append($$anchor2, div_4);
    });
    var node_7 = sibling(node_4, 2);
    {
      var consequent_5 = ($$anchor2) => {
        var div_6 = root_9();
        let styles_3;
        var span_4 = child(div_6);
        var text_5 = child(span_4, true);
        reset(span_4);
        next(2);
        reset(div_6);
        template_effect(() => {
          styles_3 = set_style(div_6, "", styles_3, { top: `${get(nowOffset) ?? ""}px` });
          set_text(text_5, clock.hm);
        });
        append($$anchor2, div_6);
      };
      if_block(node_7, ($$render) => {
        if (get(nowOffset) >= 0) $$render(consequent_5);
      });
    }
    var node_8 = sibling(node_7, 2);
    each(node_8, 17, () => get(positionedEvents), (p) => p.ev.id, ($$anchor2, p) => {
      var button_1 = root_10$1();
      let classes_3;
      let styles_4;
      var div_7 = sibling(child(button_1), 2);
      var span_5 = child(div_7);
      var text_6 = child(span_5, true);
      reset(span_5);
      var node_9 = sibling(span_5, 2);
      {
        var consequent_6 = ($$anchor3) => {
          var span_6 = root_11$1();
          var text_7 = child(span_6);
          reset(span_6);
          template_effect(($0, $1) => set_text(text_7, `${$0 ?? ""} – ${$1 ?? ""}`), [
            () => fmtTime$1(get(p).ev.start, $$props.locale),
            () => fmtTime$1(get(p).ev.end, $$props.locale)
          ]);
          append($$anchor3, span_6);
        };
        if_block(node_9, ($$render) => {
          if (get(p).height > 32) $$render(consequent_6);
        });
      }
      var node_10 = sibling(node_9, 2);
      {
        var consequent_7 = ($$anchor3) => {
          var span_7 = root_12();
          var text_8 = child(span_7, true);
          reset(span_7);
          template_effect(() => set_text(text_8, get(p).ev.subtitle));
          append($$anchor3, span_7);
        };
        if_block(node_10, ($$render) => {
          if (get(p).ev.subtitle && get(p).height > 48) $$render(consequent_7);
        });
      }
      var node_11 = sibling(node_10, 2);
      {
        var consequent_8 = ($$anchor3) => {
          var span_8 = root_13$1();
          var text_9 = child(span_8, true);
          reset(span_8);
          template_effect(() => set_text(text_9, get(p).ev.location));
          append($$anchor3, span_8);
        };
        if_block(node_11, ($$render) => {
          if (get(p).ev.location && get(p).height > 56) $$render(consequent_8);
        });
      }
      var node_12 = sibling(node_11, 2);
      {
        var consequent_9 = ($$anchor3) => {
          var div_8 = root_14$1();
          each(div_8, 21, () => get(p).ev.tags, index, ($$anchor4, tag) => {
            var span_9 = root_15();
            var text_10 = child(span_9, true);
            reset(span_9);
            template_effect(() => set_text(text_10, get(tag)));
            append($$anchor4, span_9);
          });
          reset(div_8);
          append($$anchor3, div_8);
        };
        if_block(node_12, ($$render) => {
          if (get(p).ev.tags?.length && get(p).height > 56) $$render(consequent_9);
        });
      }
      reset(div_7);
      var node_13 = sibling(div_7, 2);
      {
        var consequent_10 = ($$anchor3) => {
          var span_10 = root_16();
          append($$anchor3, span_10);
        };
        var consequent_11 = ($$anchor3) => {
          var span_11 = root_17();
          var text_11 = child(span_11, true);
          reset(span_11);
          template_effect(() => set_text(text_11, get(L).upNext));
          append($$anchor3, span_11);
        };
        if_block(node_13, ($$render) => {
          if (get(p).isCurrent) $$render(consequent_10);
          else if (get(p).isNext) $$render(consequent_11, 1);
        });
      }
      reset(button_1);
      template_effect(() => {
        classes_3 = set_class(button_1, 1, "mb-event svelte-zbkzcp", null, classes_3, {
          "mb-event--selected": selectedEventId() === get(p).ev.id,
          "mb-event--current": get(p).isCurrent,
          "mb-event--next": get(p).isNext,
          "mb-event--cancelled": get(p).ev.status === "cancelled",
          "mb-event--tentative": get(p).ev.status === "tentative",
          "mb-event--full": get(p).ev.status === "full",
          "mb-event--limited": get(p).ev.status === "limited"
        });
        set_attribute(button_1, "aria-label", `${get(p).ev.title ?? ""}${get(p).ev.status === "cancelled" ? " (cancelled)" : ""}${get(p).ev.status === "tentative" ? " (tentative)" : ""}${get(p).ev.status === "full" ? " (full)" : ""}${get(p).ev.status === "limited" ? " (limited)" : ""}${get(p).isCurrent ? `, ${get(L).inProgress}` : ""}${get(p).isNext ? `, ${get(L).upNext}` : ""}`);
        styles_4 = set_style(button_1, "", styles_4, {
          top: `${get(p).top ?? ""}px`,
          height: `${get(p).height ?? ""}px`,
          left: get(p).left,
          width: get(p).width,
          "--ev-color": get(p).ev.color ?? "var(--dt-accent)"
        });
        set_text(text_6, get(p).ev.title);
      });
      delegated("click", button_1, (e) => {
        e.stopPropagation();
        $$props.oneventclick?.(get(p).ev);
      });
      event("pointerenter", button_1, () => get(oneventhover)?.(get(p).ev));
      append($$anchor2, button_1);
    });
    reset(div_3);
    reset(div_2);
    bind_this(div_2, ($$value) => gridEl = $$value, () => gridEl);
    reset(div);
    template_effect(() => {
      classes = set_class(div, 1, "mb svelte-zbkzcp", null, classes, { "mb--auto": get(autoHeight) });
      styles = set_style(div, style() || void 0, styles, {
        height: get(autoHeight) ? void 0 : height() ? `${height()}px` : "100%"
      });
      set_attribute(div, "aria-label", get(L).dayPlanner);
      styles_2 = set_style(div_3, "", styles_2, { height: `${get(gridHeight) ?? ""}px` });
    });
    delegated("touchstart", div, onTouchStart);
    delegated("touchmove", div, onTouchMove);
    delegated("touchend", div, onTouchEnd);
    delegated("click", div_2, handleGridClick);
    delegated("keydown", div_2, (e) => {
      if (e.key === "Enter" || e.key === " ") handleGridClick(e);
    });
    append($$anchor, div);
    pop();
  }
  delegate(["touchstart", "touchmove", "touchend", "click", "keydown"]);
  var root_2$1 = /* @__PURE__ */ from_html(`<span> </span>`);
  var root_3 = /* @__PURE__ */ from_html(`<span class="mw-empty svelte-1d18hkf"> </span>`);
  var root_6$1 = /* @__PURE__ */ from_html(`<span class="mw-ev-time svelte-1d18hkf"> </span>`);
  var root_7$1 = /* @__PURE__ */ from_html(`<span class="mw-ev-time svelte-1d18hkf"> </span>`);
  var root_5$1 = /* @__PURE__ */ from_html(`<button type="button"><span class="mw-ev-stripe svelte-1d18hkf"></span> <div class="mw-ev-body svelte-1d18hkf"><span class="mw-ev-title svelte-1d18hkf"> </span> <!></div></button>`);
  var root_8$1 = /* @__PURE__ */ from_html(`<span class="mw-ev-more svelte-1d18hkf"> </span>`);
  var root_4$1 = /* @__PURE__ */ from_html(`<!> <!>`, 1);
  var root_1 = /* @__PURE__ */ from_html(`<div role="listitem"><button class="mw-row-target svelte-1d18hkf"></button> <div class="mw-date svelte-1d18hkf"><span> </span> <!></div> <div class="mw-events svelte-1d18hkf"><!></div> <svg class="mw-chevron svelte-1d18hkf" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5"></path></svg></div>`);
  var root$1 = /* @__PURE__ */ from_html(`<div role="region"><div class="mw-list svelte-1d18hkf" role="list"></div></div>`);
  function MobileWeek($$anchor, $$props) {
    push($$props, true);
    const L = /* @__PURE__ */ user_derived(getLabels);
    let mondayStart = prop($$props, "mondayStart", 3, true), height = prop($$props, "height", 3, null), events = prop($$props, "events", 19, () => []), style = prop($$props, "style", 3, ""), selectedEventId = prop($$props, "selectedEventId", 3, null);
    prop($$props, "readOnly", 3, false);
    const ctx = useCalendarContext();
    const viewState = /* @__PURE__ */ user_derived(() => ctx.viewState);
    const equalDays = /* @__PURE__ */ user_derived(() => ctx.equalDays);
    const showDates = /* @__PURE__ */ user_derived(() => ctx.showDates);
    const hideDays = /* @__PURE__ */ user_derived(() => ctx.hideDays);
    const autoHeight = /* @__PURE__ */ user_derived(() => ctx.autoHeight);
    const oneventhover = /* @__PURE__ */ user_derived(() => ctx.oneventhover);
    const disabledSet = /* @__PURE__ */ user_derived(() => ctx.disabledSet);
    const loadRangeCtx = /* @__PURE__ */ user_derived(() => ctx.loadRange);
    const clock = createClock();
    const MAX_EVENTS = 3;
    const customDays = /* @__PURE__ */ user_derived(() => get(viewState)?.dayCount ?? 7);
    const todayMs = /* @__PURE__ */ user_derived(() => clock.today);
    const focusMs = /* @__PURE__ */ user_derived(() => $$props.focusDate ? sod($$props.focusDate.getTime()) : get(todayMs));
    const weekStart = /* @__PURE__ */ user_derived(() => get(customDays) === 7 ? startOfWeek(get(focusMs), mondayStart()) : sod(get(focusMs)));
    user_effect(() => {
      if (!get(loadRangeCtx)) return;
      const rangeStart = new Date(get(weekStart) - 7 * DAY_MS);
      const rangeEnd = new Date(get(weekStart) + (get(customDays) + 7) * DAY_MS);
      get(loadRangeCtx).set({ start: rangeStart, end: rangeEnd });
      return () => get(loadRangeCtx).set(null);
    });
    const dayCells = /* @__PURE__ */ user_derived(() => {
      const result = [];
      const hideSet = new Set(get(hideDays) ?? []);
      for (let i = 0; i < get(customDays); i++) {
        const ms = get(weekStart) + i * DAY_MS;
        const d = new Date(ms);
        const jsDay = d.getDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;
        if (hideSet.has(isoDay)) continue;
        const isToday = ms === get(todayMs);
        const isPast = get(equalDays) ? false : ms < get(todayMs);
        const isWeekend = jsDay === 0 || jsDay === 6;
        const isDisabled = get(disabledSet).has(ms);
        const dayEnd = ms + DAY_MS;
        const dayEvents = events().filter((ev) => ev.start.getTime() < dayEnd && ev.end.getTime() > ms).sort((a, b) => a.start.getTime() - b.start.getTime());
        const allDayCount = dayEvents.filter((ev) => isAllDay(ev) || isMultiDay(ev)).length;
        result.push({
          ms,
          dayNum: d.getDate(),
          dayName: weekdayShort(ms, $$props.locale),
          isToday,
          isPast,
          isDisabled,
          isWeekend,
          events: dayEvents,
          allDayCount,
          totalCount: dayEvents.length
        });
      }
      return result;
    });
    function fmtTime2(d) {
      return fmtTime$1(d, $$props.locale);
    }
    let touchStartX = 0;
    let touchStartY = 0;
    let swiping = false;
    let swipeOffset = /* @__PURE__ */ state(0);
    const SWIPE_THRESHOLD = 60;
    function onTouchStart(e) {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      swiping = true;
      set(swipeOffset, 0);
    }
    function onTouchMove(e) {
      if (!swiping) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dy) > Math.abs(dx) * 0.8) {
        swiping = false;
        return;
      }
      set(swipeOffset, dx);
    }
    function onTouchEnd() {
      if (!swiping) {
        set(swipeOffset, 0);
        return;
      }
      if (Math.abs(get(swipeOffset)) > SWIPE_THRESHOLD) {
        if (get(swipeOffset) > 0) {
          get(viewState)?.prev();
        } else {
          get(viewState)?.next();
        }
      }
      set(swipeOffset, 0);
      swiping = false;
    }
    function handleDayTap(dayMs) {
      if (get(viewState)) {
        get(viewState).setFocusDate(new Date(dayMs));
        const currentView = get(viewState).view;
        const dayView = currentView.replace("week", "day");
        get(viewState).setView(dayView);
      }
    }
    function handleDayKeydown(e, dayMs) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      handleDayTap(dayMs);
    }
    var div = root$1();
    let classes;
    let styles;
    var div_1 = child(div);
    each(div_1, 21, () => get(dayCells), (cell) => cell.ms, ($$anchor2, cell) => {
      var div_2 = root_1();
      let classes_1;
      var button = child(div_2);
      var div_3 = sibling(button, 2);
      var span = child(div_3);
      let classes_2;
      var text2 = child(span, true);
      reset(span);
      var node = sibling(span, 2);
      {
        var consequent = ($$anchor3) => {
          var span_1 = root_2$1();
          let classes_3;
          var text_1 = child(span_1, true);
          reset(span_1);
          template_effect(() => {
            classes_3 = set_class(span_1, 1, "mw-day-num svelte-1d18hkf", null, classes_3, { "mw-day-num--today": get(cell).isToday });
            set_text(text_1, get(cell).dayNum);
          });
          append($$anchor3, span_1);
        };
        if_block(node, ($$render) => {
          if (get(showDates)) $$render(consequent);
        });
      }
      reset(div_3);
      var div_4 = sibling(div_3, 2);
      var node_1 = child(div_4);
      {
        var consequent_1 = ($$anchor3) => {
          var span_2 = root_3();
          var text_2 = child(span_2, true);
          reset(span_2);
          template_effect(() => set_text(text_2, get(L).noEvents));
          append($$anchor3, span_2);
        };
        var alternate_1 = ($$anchor3) => {
          var fragment = root_4$1();
          var node_2 = first_child(fragment);
          each(node_2, 17, () => get(cell).events.slice(0, MAX_EVENTS), (ev) => ev.id, ($$anchor4, ev) => {
            var button_1 = root_5$1();
            let classes_4;
            let styles_1;
            var div_5 = sibling(child(button_1), 2);
            var span_3 = child(div_5);
            var text_3 = child(span_3, true);
            reset(span_3);
            var node_3 = sibling(span_3, 2);
            {
              var consequent_2 = ($$anchor5) => {
                var span_4 = root_6$1();
                var text_4 = child(span_4, true);
                reset(span_4);
                template_effect(() => set_text(text_4, get(L).allDay));
                append($$anchor5, span_4);
              };
              var d_1 = /* @__PURE__ */ user_derived(() => isAllDay(get(ev)) || isMultiDay(get(ev)));
              var alternate = ($$anchor5) => {
                var span_5 = root_7$1();
                var text_5 = child(span_5, true);
                reset(span_5);
                template_effect(($0) => set_text(text_5, $0), [() => fmtTime2(get(ev).start)]);
                append($$anchor5, span_5);
              };
              if_block(node_3, ($$render) => {
                if (get(d_1)) $$render(consequent_2);
                else $$render(alternate, -1);
              });
            }
            reset(div_5);
            reset(button_1);
            template_effect(
              ($0) => {
                classes_4 = set_class(button_1, 1, "mw-ev svelte-1d18hkf", null, classes_4, $0);
                styles_1 = set_style(button_1, "", styles_1, { "--ev-color": get(ev).color ?? "var(--dt-accent)" });
                set_text(text_3, get(ev).title);
              },
              [
                () => ({
                  "mw-ev--selected": selectedEventId() === get(ev).id,
                  "mw-ev--allday": isAllDay(get(ev)) || isMultiDay(get(ev)),
                  "mw-ev--current": !isAllDay(get(ev)) && !isMultiDay(get(ev)) && get(ev).start.getTime() <= clock.tick && get(ev).end.getTime() > clock.tick,
                  "mw-ev--cancelled": get(ev).status === "cancelled",
                  "mw-ev--tentative": get(ev).status === "tentative",
                  "mw-ev--full": get(ev).status === "full",
                  "mw-ev--limited": get(ev).status === "limited"
                })
              ]
            );
            delegated("click", button_1, (e) => {
              e.stopPropagation();
              $$props.oneventclick?.(get(ev));
            });
            delegated("keydown", button_1, (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                $$props.oneventclick?.(get(ev));
              }
            });
            event("pointerenter", button_1, () => get(oneventhover)?.(get(ev)));
            append($$anchor4, button_1);
          });
          var node_4 = sibling(node_2, 2);
          {
            var consequent_3 = ($$anchor4) => {
              var span_6 = root_8$1();
              var text_6 = child(span_6, true);
              reset(span_6);
              template_effect(($0) => set_text(text_6, $0), [() => get(L).nMore(get(cell).totalCount - MAX_EVENTS)]);
              append($$anchor4, span_6);
            };
            if_block(node_4, ($$render) => {
              if (get(cell).totalCount > MAX_EVENTS) $$render(consequent_3);
            });
          }
          append($$anchor3, fragment);
        };
        if_block(node_1, ($$render) => {
          if (get(cell).events.length === 0) $$render(consequent_1);
          else $$render(alternate_1, -1);
        });
      }
      reset(div_4);
      next(2);
      reset(div_2);
      template_effect(() => {
        classes_1 = set_class(div_2, 1, "mw-row svelte-1d18hkf", null, classes_1, {
          "mw-row--today": get(cell).isToday,
          "mw-row--past": get(cell).isPast,
          "mw-row--weekend": get(cell).isWeekend,
          "mw-row--disabled": get(cell).isDisabled
        });
        button.disabled = get(cell).isDisabled;
        set_attribute(button, "aria-label", `${get(cell).dayName ?? ""} ${get(cell).dayNum ?? ""}`);
        classes_2 = set_class(span, 1, "mw-day-name svelte-1d18hkf", null, classes_2, { "mw-day-name--today": get(cell).isToday });
        set_text(text2, get(cell).dayName);
      });
      delegated("click", button, () => handleDayTap(get(cell).ms));
      delegated("keydown", button, (e) => handleDayKeydown(e, get(cell).ms));
      append($$anchor2, div_2);
    });
    reset(div_1);
    reset(div);
    template_effect(() => {
      classes = set_class(div, 1, "mw svelte-1d18hkf", null, classes, { "mw--auto": get(autoHeight) });
      styles = set_style(div, style() || void 0, styles, {
        height: get(autoHeight) ? void 0 : height() ? `${height()}px` : "100%"
      });
      set_attribute(div, "aria-label", get(L).weekAhead);
    });
    delegated("touchstart", div, onTouchStart);
    delegated("touchmove", div, onTouchMove);
    delegated("touchend", div, onTouchEnd);
    append($$anchor, div);
    pop();
  }
  delegate(["touchstart", "touchmove", "touchend", "click", "keydown"]);
  function Mobile($$anchor, $$props) {
    let mode = prop($$props, "mode", 3, "day"), rest = /* @__PURE__ */ rest_props($$props, ["$$slots", "$$events", "$$legacy", "mode"]);
    var fragment = comment();
    var node = first_child(fragment);
    {
      var consequent = ($$anchor2) => {
        MobileDay($$anchor2, spread_props(() => rest));
      };
      var alternate = ($$anchor2) => {
        MobileWeek($$anchor2, spread_props(() => rest));
      };
      if_block(node, ($$render) => {
        if (mode() === "day") $$render(consequent);
        else $$render(alternate, -1);
      });
    }
    append($$anchor, fragment);
  }
  var root_4 = /* @__PURE__ */ from_html(`<button class="cal-m-nav svelte-1b53e7w"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true" class="svelte-1b53e7w"><path d="M10 3 5 8l5 5" class="svelte-1b53e7w"></path></svg></button>`);
  var root_6 = /* @__PURE__ */ from_html(`<button> </button>`);
  var root_5 = /* @__PURE__ */ from_html(`<div class="cal-m-pills svelte-1b53e7w" role="group"></div>`);
  var root_7 = /* @__PURE__ */ from_html(`<button class="cal-m-nav svelte-1b53e7w"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true" class="svelte-1b53e7w"><path d="M6 3l5 5-5 5" class="svelte-1b53e7w"></path></svg></button>`);
  var root_8 = /* @__PURE__ */ from_html(`<div class="cal-m-today-bar svelte-1b53e7w"><button class="cal-m-today svelte-1b53e7w"> </button></div>`);
  var root_2 = /* @__PURE__ */ from_html(`<div class="cal-m-hd svelte-1b53e7w"><div class="cal-m-left svelte-1b53e7w"><!> <!></div> <span class="cal-m-title svelte-1b53e7w"> </span> <div class="cal-m-right svelte-1b53e7w"><!></div></div> <!>`, 1);
  var root_11 = /* @__PURE__ */ from_html(`<button> </button>`);
  var root_10 = /* @__PURE__ */ from_html(`<div class="cal-pills svelte-1b53e7w" role="group"></div>`);
  var root_13 = /* @__PURE__ */ from_html(`<div class="cal-empty svelte-1b53e7w">No views registered.</div>`);
  var root_14 = /* @__PURE__ */ from_html(`<div class="cal-loading svelte-1b53e7w"></div>`);
  var root = /* @__PURE__ */ from_html(`<div role="region"><!> <div class="cal-body svelte-1b53e7w"><!></div> <!></div>`);
  function Calendar($$anchor, $$props) {
    push($$props, true);
    const MOBILE_BREAKPOINT = 768;
    const DEFAULT_VIEWS = [
      {
        id: "day-planner",
        label: "Planner",
        mode: "day",
        component: Planner
      },
      {
        id: "week-planner",
        label: "Planner",
        mode: "week",
        component: Planner
      },
      {
        id: "day-agenda",
        label: "Agenda",
        mode: "day",
        component: Agenda
      },
      {
        id: "week-agenda",
        label: "Agenda",
        mode: "week",
        component: Agenda
      },
      {
        id: "day-mobile",
        label: "Mobile",
        mode: "day",
        component: Mobile
      },
      {
        id: "week-mobile",
        label: "Mobile",
        mode: "week",
        component: Mobile
      }
    ];
    let views = prop($$props, "views", 3, DEFAULT_VIEWS), theme = prop($$props, "theme", 3, auto), mondayStart = prop($$props, "mondayStart", 3, true), heightProp = prop($$props, "height", 3, 600), borderRadius = prop($$props, "borderRadius", 3, 12), readOnly = prop($$props, "readOnly", 3, false), snapInterval = prop($$props, "snapInterval", 3, 15), showModePills = prop($$props, "showModePills", 3, true), showNavigation = prop($$props, "showNavigation", 3, true), equalDays = prop($$props, "equalDays", 3, false), showDates = prop($$props, "showDates", 3, true), compact = prop($$props, "compact", 3, false), mobileProp = prop($$props, "mobile", 3, "auto");
    const effectiveCreate = /* @__PURE__ */ user_derived(() => readOnly() ? void 0 : $$props.oneventcreate);
    const effectiveMove = /* @__PURE__ */ user_derived(() => readOnly() ? void 0 : $$props.oneventmove);
    let containerWidth = /* @__PURE__ */ state(0);
    const isMobileContainer = /* @__PURE__ */ user_derived(() => get(containerWidth) > 0 && get(containerWidth) < MOBILE_BREAKPOINT);
    const useMobile = /* @__PURE__ */ user_derived(() => mobileProp() === "auto" ? get(isMobileContainer) : Boolean(mobileProp()));
    let calEl = /* @__PURE__ */ state(void 0);
    let probedTheme = /* @__PURE__ */ state("");
    const needsProbe = /* @__PURE__ */ user_derived(() => theme() === auto && $$props.autoTheme !== false);
    onMount(() => {
      if (!get(calEl)) return;
      set(containerWidth, get(calEl).clientWidth, true);
      const ro = new ResizeObserver((entries) => {
        set(containerWidth, Math.round(entries[0].contentRect.width), true);
      });
      ro.observe(get(calEl));
      if (!get(needsProbe)) return () => ro.disconnect();
      const opts = typeof $$props.autoTheme === "object" ? $$props.autoTheme : {};
      const stopTheme = observeHostTheme(
        get(calEl),
        (vars) => {
          set(probedTheme, vars, true);
        },
        opts
      );
      return () => {
        ro.disconnect();
        stopTheme?.();
      };
    });
    const effectiveTheme = /* @__PURE__ */ user_derived(() => theme() === auto && $$props.autoTheme !== false ? get(probedTheme) : theme());
    const store = /* @__PURE__ */ user_derived(() => createEventStore($$props.adapter));
    const viewState = createViewState(untrack(() => ({
      view: $$props.view ?? views()[0]?.id,
      mondayStart: mondayStart(),
      initialDate: $$props.initialDate,
      dayCount: $$props.days,
      modeForView: (viewId) => views().find((v) => v.id === viewId)?.mode
    })));
    const selection = createSelection();
    const drag = createDragState();
    async function commitDrag() {
      if (readOnly()) {
        drag.cancel();
        return;
      }
      const mode = drag.mode;
      const payload = drag.commit();
      if (!payload) return;
      let { start, end } = payload;
      if (mode === "create" || mode === "resize-start" || mode === "resize-end") {
        const durationMs = end.getTime() - start.getTime();
        const durationMin = durationMs / 6e4;
        if ($$props.minDuration && durationMin < $$props.minDuration) {
          if (mode === "resize-start") {
            start = new Date(end.getTime() - $$props.minDuration * 6e4);
          } else {
            end = new Date(start.getTime() + $$props.minDuration * 6e4);
          }
        }
        if ($$props.maxDuration && durationMin > $$props.maxDuration) {
          if (mode === "resize-start") {
            start = new Date(end.getTime() - $$props.maxDuration * 6e4);
          } else {
            end = new Date(start.getTime() + $$props.maxDuration * 6e4);
          }
        }
      }
      if ($$props.disabledDates?.length) {
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(end.getTime() - 1);
        endDay.setHours(0, 0, 0, 0);
        for (const dd of $$props.disabledDates) {
          const dt = new Date(dd);
          dt.setHours(0, 0, 0, 0);
          const ts = dt.getTime();
          if (ts >= startDay.getTime() && ts <= endDay.getTime()) return;
        }
      }
      if ($$props.blockedSlots?.length) {
        const startH = start.getHours() + start.getMinutes() / 60;
        const endH = end.getHours() + end.getMinutes() / 60 + (end.getDate() !== start.getDate() ? 24 : 0);
        const jsDay = start.getDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;
        for (const slot of $$props.blockedSlots) {
          if (slot.day && slot.day !== isoDay) continue;
          if (startH < slot.end && endH > slot.start) return;
        }
      }
      if ((mode === "move" || mode === "resize-start" || mode === "resize-end") && payload.eventId) {
        try {
          await get(store).move(payload.eventId, start, end);
          const ev = get(store).byId(payload.eventId);
          if (ev) get(effectiveMove)?.(ev, start, end);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (!msg.includes("read-only") && !msg.includes("not found")) {
            console.warn("[calendar] drag commit failed:", e);
          }
        }
      } else if (mode === "create") {
        get(effectiveCreate)?.({ start, end });
      }
    }
    let viewLoadRange = /* @__PURE__ */ state(null);
    setContext("calendar", {
      // Engine objects (hold $state internally)
      get store() {
        return get(store);
      },
      viewState,
      selection,
      drag,
      commitDrag,
      // Callbacks
      get oneventclick() {
        return $$props.oneventclick;
      },
      get oneventcreate() {
        return get(effectiveCreate);
      },
      get oneventmove() {
        return get(effectiveMove);
      },
      get oneventhover() {
        return $$props.oneventhover;
      },
      // Config (reactive via getters)
      get readOnly() {
        return readOnly();
      },
      get visibleHours() {
        return $$props.visibleHours;
      },
      get snapInterval() {
        return snapInterval();
      },
      get eventSnippet() {
        return $$props.event;
      },
      get emptySnippet() {
        return $$props.empty;
      },
      get showNavigation() {
        return showNavigation();
      },
      get equalDays() {
        return equalDays();
      },
      get showDates() {
        return showDates();
      },
      get hideDays() {
        return $$props.hideDays;
      },
      get blockedSlots() {
        return $$props.blockedSlots;
      },
      get dayHeaderSnippet() {
        return $$props.dayHeader;
      },
      get minDuration() {
        return $$props.minDuration;
      },
      get maxDuration() {
        return $$props.maxDuration;
      },
      get disabledDates() {
        return $$props.disabledDates;
      },
      get mobile() {
        return get(useMobile);
      },
      get autoHeight() {
        return heightProp() === "auto";
      },
      get compact() {
        return compact();
      },
      // Load range (read/write)
      get loadRange() {
        return get(viewLoadRange);
      },
      setLoadRange(range) {
        set(viewLoadRange, range, true);
      }
    });
    user_effect(() => {
      const range = get(viewLoadRange) ?? viewState.range;
      get(store).load({ start: range.start, end: range.end });
    });
    untrack(() => get(store).load({ start: viewState.range.start, end: viewState.range.end }));
    user_effect(() => {
      if ($$props.view) viewState.setView($$props.view);
    });
    user_effect(() => {
      if ($$props.currentDate) viewState.setFocusDate($$props.currentDate);
    });
    user_effect(() => {
      if ($$props.days !== void 0 && viewState.dayCount !== $$props.days) viewState.setDayCount($$props.days);
    });
    user_effect(() => {
      const d = viewState.focusDate;
      $$props.ondatechange?.(d);
    });
    user_effect(() => {
      if (viewState.mondayStart !== mondayStart()) {
        viewState.setMondayStart(mondayStart());
      }
    });
    user_effect(() => {
      $$props.onviewchange?.(viewState.view);
    });
    const resolvedView = /* @__PURE__ */ user_derived(() => {
      const requested = views().find((v) => v.id === viewState.view) ?? views()[0];
      if (!get(useMobile) || !requested) return requested;
      if (requested.id.endsWith("-mobile")) return requested;
      if (requested.label === "Agenda") return requested;
      const mobileVariant = views().find((v) => v.id === `${requested.mode}-mobile`);
      return mobileVariant ?? requested;
    });
    const activeView = /* @__PURE__ */ user_derived(() => get(resolvedView));
    const desktopViews = /* @__PURE__ */ user_derived(() => views().filter((v) => !v.id.endsWith("-mobile")));
    const dateLabel = /* @__PURE__ */ user_derived(() => {
      if (!showDates()) {
        if (viewState.mode === "day") {
          return viewState.focusDate.toLocaleDateString($$props.locale, { weekday: "long" });
        }
        return "";
      }
      if (viewState.mode === "day") {
        return viewState.focusDate.toLocaleDateString($$props.locale, { weekday: "long", month: "short", day: "numeric" });
      }
      return viewState.focusDate.toLocaleDateString($$props.locale, { month: "long", year: "numeric" });
    });
    const modes = /* @__PURE__ */ user_derived(() => {
      const g = new Set(get(desktopViews).map((v) => v.mode));
      return ["day", "week"].filter((key) => g.has(key));
    });
    const L = /* @__PURE__ */ user_derived(getLabels);
    function switchMode(g) {
      const currentLabel = get(desktopViews).find((v) => v.id === viewState.view)?.label ?? get(activeView)?.label;
      const match = get(desktopViews).find((v) => v.mode === g && v.label === currentLabel);
      const fallback = get(desktopViews).find((v) => v.mode === g);
      const target = match ?? fallback;
      if (target) viewState.setView(target.id);
    }
    const viewIncludesToday = /* @__PURE__ */ user_derived(() => {
      const now = Date.now();
      const { start, end } = viewState.range;
      return now >= start.getTime() && now < end.getTime();
    });
    const headerCtx = /* @__PURE__ */ user_derived(() => ({
      dateLabel: get(dateLabel),
      mode: viewState.mode,
      modes: get(modes),
      switchMode,
      prev: () => viewState.prev(),
      next: () => viewState.next(),
      goToday: () => viewState.goToday(),
      isViewOnToday: get(viewIncludesToday),
      focusDate: viewState.focusDate
    }));
    const navCtx = /* @__PURE__ */ user_derived(() => ({
      prev: () => viewState.prev(),
      next: () => viewState.next(),
      goToday: () => viewState.goToday(),
      isViewOnToday: get(viewIncludesToday),
      focusDate: viewState.focusDate,
      mode: viewState.mode
    }));
    var div = root();
    let classes;
    var node = child(div);
    {
      var consequent = ($$anchor2) => {
        var fragment = comment();
        var node_1 = first_child(fragment);
        snippet(node_1, () => $$props.header, () => get(headerCtx));
        append($$anchor2, fragment);
      };
      var consequent_6 = ($$anchor2) => {
        var fragment_1 = root_2();
        var div_1 = first_child(fragment_1);
        var div_2 = child(div_1);
        var node_2 = child(div_2);
        {
          var consequent_1 = ($$anchor3) => {
            var fragment_2 = comment();
            var node_3 = first_child(fragment_2);
            snippet(node_3, () => $$props.navigation, () => get(navCtx));
            append($$anchor3, fragment_2);
          };
          var consequent_2 = ($$anchor3) => {
            var button = root_4();
            template_effect(() => set_attribute(button, "aria-label", viewState.mode === "day" ? get(L).previousDay : get(L).previousWeek));
            delegated("click", button, () => viewState.prev());
            append($$anchor3, button);
          };
          if_block(node_2, ($$render) => {
            if ($$props.navigation) $$render(consequent_1);
            else if (showNavigation()) $$render(consequent_2, 1);
          });
        }
        var node_4 = sibling(node_2, 2);
        {
          var consequent_3 = ($$anchor3) => {
            var div_3 = root_5();
            each(div_3, 21, () => get(modes), index, ($$anchor4, g) => {
              var button_1 = root_6();
              let classes_1;
              var text2 = child(button_1, true);
              reset(button_1);
              template_effect(() => {
                classes_1 = set_class(button_1, 1, "cal-m-pill svelte-1b53e7w", null, classes_1, { "cal-m-pill--active": viewState.mode === get(g) });
                set_attribute(button_1, "aria-pressed", viewState.mode === get(g));
                set_text(text2, get(g) === "day" ? get(L).day : get(L).week);
              });
              delegated("click", button_1, () => switchMode(get(g)));
              append($$anchor4, button_1);
            });
            reset(div_3);
            template_effect(() => set_attribute(div_3, "aria-label", get(L).viewMode));
            append($$anchor3, div_3);
          };
          if_block(node_4, ($$render) => {
            if (showModePills() && get(modes).length > 1) $$render(consequent_3);
          });
        }
        reset(div_2);
        var span = sibling(div_2, 2);
        var text_1 = child(span, true);
        reset(span);
        var div_4 = sibling(span, 2);
        var node_5 = child(div_4);
        {
          var consequent_4 = ($$anchor3) => {
            var button_2 = root_7();
            template_effect(() => set_attribute(button_2, "aria-label", viewState.mode === "day" ? get(L).nextDay : get(L).nextWeek));
            delegated("click", button_2, () => viewState.next());
            append($$anchor3, button_2);
          };
          if_block(node_5, ($$render) => {
            if (!$$props.navigation && showNavigation()) $$render(consequent_4);
          });
        }
        reset(div_4);
        reset(div_1);
        var node_6 = sibling(div_1, 2);
        {
          var consequent_5 = ($$anchor3) => {
            var div_5 = root_8();
            var button_3 = child(div_5);
            var text_2 = child(button_3, true);
            reset(button_3);
            reset(div_5);
            template_effect(() => set_text(text_2, get(L).today));
            delegated("click", button_3, () => viewState.goToday());
            append($$anchor3, div_5);
          };
          if_block(node_6, ($$render) => {
            if (!$$props.navigation && showNavigation() && !get(viewIncludesToday)) $$render(consequent_5);
          });
        }
        template_effect(() => set_text(text_1, get(dateLabel)));
        append($$anchor2, fragment_1);
      };
      var alternate = ($$anchor2) => {
        var fragment_3 = comment();
        var node_7 = first_child(fragment_3);
        {
          var consequent_7 = ($$anchor3) => {
            var div_6 = root_10();
            each(div_6, 21, () => get(modes), index, ($$anchor4, g) => {
              var button_4 = root_11();
              let classes_2;
              var text_3 = child(button_4, true);
              reset(button_4);
              template_effect(() => {
                classes_2 = set_class(button_4, 1, "cal-pill svelte-1b53e7w", null, classes_2, { "cal-pill--active": viewState.mode === get(g) });
                set_attribute(button_4, "aria-pressed", viewState.mode === get(g));
                set_text(text_3, get(g) === "day" ? get(L).day : get(L).week);
              });
              delegated("click", button_4, () => switchMode(get(g)));
              append($$anchor4, button_4);
            });
            reset(div_6);
            template_effect(() => set_attribute(div_6, "aria-label", get(L).viewMode));
            append($$anchor3, div_6);
          };
          if_block(node_7, ($$render) => {
            if (showModePills() && get(modes).length > 1 && get(activeView)?.label !== "Agenda") $$render(consequent_7);
          });
        }
        append($$anchor2, fragment_3);
      };
      if_block(node, ($$render) => {
        if ($$props.header) $$render(consequent);
        else if (get(useMobile)) $$render(consequent_6, 1);
        else $$render(alternate, -1);
      });
    }
    var div_7 = sibling(node, 2);
    var node_8 = child(div_7);
    {
      var consequent_8 = ($$anchor2) => {
        const Comp = /* @__PURE__ */ user_derived(() => get(activeView).component);
        var fragment_4 = comment();
        var node_9 = first_child(fragment_4);
        component(node_9, () => get(Comp), ($$anchor3, Comp_1) => {
          Comp_1($$anchor3, spread_props(
            {
              get events() {
                return get(store).events;
              },
              get style() {
                return get(effectiveTheme);
              },
              height: null,
              get mode() {
                return get(activeView).mode;
              },
              get mondayStart() {
                return viewState.mondayStart;
              },
              get locale() {
                return $$props.locale;
              },
              get focusDate() {
                return viewState.focusDate;
              },
              get oneventclick() {
                return $$props.oneventclick;
              },
              get oneventcreate() {
                return get(effectiveCreate);
              },
              get readOnly() {
                return readOnly();
              },
              get visibleHours() {
                return $$props.visibleHours;
              },
              get selectedEventId() {
                return selection.selectedId;
              }
            },
            () => get(activeView).props ?? {}
          ));
        });
        append($$anchor2, fragment_4);
      };
      var alternate_1 = ($$anchor2) => {
        var div_8 = root_13();
        append($$anchor2, div_8);
      };
      if_block(node_8, ($$render) => {
        if (get(activeView)) $$render(consequent_8);
        else $$render(alternate_1, -1);
      });
    }
    reset(div_7);
    var node_10 = sibling(div_7, 2);
    {
      var consequent_9 = ($$anchor2) => {
        var div_9 = root_14();
        append($$anchor2, div_9);
      };
      if_block(node_10, ($$render) => {
        if (get(store).loading) $$render(consequent_9);
      });
    }
    reset(div);
    bind_this(div, ($$value) => set(calEl, $$value), () => get(calEl));
    template_effect(() => {
      classes = set_class(div, 1, "cal svelte-1b53e7w", null, classes, { "cal--auto": heightProp() === "auto" });
      set_style(div, `${get(effectiveTheme) ?? ""}; ${heightProp() === "auto" ? "" : `--cal-h: ${heightProp()}px;`} --cal-r: ${borderRadius() ?? ""}px`);
      set_attribute(div, "aria-label", get(L).calendar);
      set_attribute(div, "dir", $$props.dir);
      set_attribute(div, "lang", $$props.locale);
      div.dir = div.dir;
    });
    append($$anchor, div);
    pop();
  }
  delegate(["click"]);
  function createRestAdapter(options) {
    const { baseUrl, headers = {} } = options;
    const mapEvents = options.mapEvents ?? ((data) => data);
    const mapEvent = options.mapEvent ?? ((data) => data);
    async function request(path, init) {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...headers,
          ...init?.headers ?? {}
        }
      });
      if (!res.ok) {
        throw new Error(`Calendar API error: ${res.status} ${res.statusText}`);
      }
      if (res.status === 204) return void 0;
      try {
        return await res.json();
      } catch {
        throw new Error(`Calendar API error: invalid JSON response from ${path}`);
      }
    }
    return {
      async fetchEvents(range) {
        const params = new URLSearchParams({
          start: range.start.toISOString(),
          end: range.end.toISOString()
        });
        const data = await request(`/events?${params}`);
        return mapEvents(data);
      },
      async createEvent(event2) {
        const data = await request("/events", {
          method: "POST",
          body: JSON.stringify(event2)
        });
        return mapEvent(data);
      },
      async updateEvent(id, patch) {
        const data = await request(`/events/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch)
        });
        return mapEvent(data);
      },
      async deleteEvent(id) {
        await request(`/events/${id}`, { method: "DELETE" });
      }
    };
  }
  const VIVID_PALETTE = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6366f1",
    "#a855f7",
    "#ec4899",
    "#f43f5e",
    "#06b6d4",
    "#84cc16",
    "#d946ef",
    "#0ea5e9",
    "#10b981"
  ];
  let counter = 0;
  function uid() {
    return `mem-${Date.now()}-${++counter}`;
  }
  function createMemoryAdapter(initial = [], options) {
    const events = [...initial];
    const palette = VIVID_PALETTE;
    const colorAssignments = /* @__PURE__ */ new Map();
    let colorIndex = 0;
    function resolveColor(ev) {
      if (ev.color) return ev.color;
      const key = ev.category ?? ev.title;
      if (!colorAssignments.has(key)) {
        colorAssignments.set(key, palette[colorIndex % palette.length]);
        colorIndex++;
      }
      return colorAssignments.get(key);
    }
    function withColor(ev) {
      const color = resolveColor(ev);
      return color ? { ...ev, color } : ev;
    }
    function overlaps(ev, range) {
      return ev.start < range.end && ev.end > range.start;
    }
    return {
      async fetchEvents(range) {
        return events.filter((ev) => overlaps(ev, range)).map(withColor);
      },
      async createEvent(data) {
        const ev = { ...data, id: uid() };
        events.push(ev);
        return withColor(ev);
      },
      async updateEvent(id, patch) {
        const idx = events.findIndex((e) => e.id === id);
        if (idx < 0) throw new Error(`Event not found: ${id}`);
        events[idx] = { ...events[idx], ...patch, id };
        return withColor(events[idx]);
      },
      async deleteEvent(id) {
        const idx = events.findIndex((e) => e.id === id);
        if (idx < 0) throw new Error(`Event not found: ${id}`);
        events.splice(idx, 1);
      }
    };
  }
  function CalendarWidget($$anchor, $$props) {
    push($$props, true);
    let theme = prop($$props, "theme", 3, "neutral"), view = prop($$props, "view", 3, "week-planner"), height = prop($$props, "height", 3, "600"), mondaystart = prop($$props, "mondaystart", 3, "true");
    const heightPx = /* @__PURE__ */ user_derived(() => parseInt(height(), 10) || 600);
    const isMondayStart = /* @__PURE__ */ user_derived(() => mondaystart() !== "false");
    const themeStyle = /* @__PURE__ */ user_derived(() => presets[theme()] || presets.neutral);
    const dirValue = /* @__PURE__ */ user_derived(() => $$props.dir === "rtl" || $$props.dir === "ltr" || $$props.dir === "auto" ? $$props.dir : void 0);
    function parseHeaders(json) {
      if (!json) return void 0;
      try {
        const parsed = JSON.parse(json);
        const out = {};
        for (const [k, v] of Object.entries(parsed)) {
          out[k] = String(v);
        }
        return out;
      } catch {
        console.warn("[day-calendar] Failed to parse headers JSON:", json);
        return void 0;
      }
    }
    function toEvent(raw, fallbackId) {
      const start = new Date(String(raw.start ?? ""));
      const end = new Date(String(raw.end ?? ""));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return null;
      }
      return {
        id: String(raw.id ?? fallbackId),
        title: String(raw.title ?? "Untitled"),
        start,
        end,
        color: raw.color ? String(raw.color) : void 0
      };
    }
    function parseEvents(json) {
      if (!json) return [];
      try {
        const raw = JSON.parse(json);
        const parsed = raw.map((e, idx) => toEvent(e, `inline-${idx}`)).filter((ev) => ev !== null);
        if (parsed.length !== raw.length) {
          console.warn(`[day-calendar] Ignored ${raw.length - parsed.length} invalid event(s) from events JSON.`);
        }
        return parsed;
      } catch {
        console.warn("[day-calendar] Failed to parse events JSON:", json);
        return [];
      }
    }
    const adapter = /* @__PURE__ */ user_derived(() => {
      if ($$props.api) {
        const parsedHeaders = parseHeaders($$props.headers);
        return createRestAdapter({
          baseUrl: $$props.api,
          headers: parsedHeaders,
          mapEvents: (data) => {
            const arr = Array.isArray(data) ? data : data.events ?? [];
            return arr.map((e, idx) => toEvent(e, `api-${idx}`)).filter((ev) => ev !== null);
          }
        });
      }
      return createMemoryAdapter(parseEvents($$props.events));
    });
    Calendar($$anchor, {
      get adapter() {
        return get(adapter);
      },
      get view() {
        return view();
      },
      get theme() {
        return get(themeStyle);
      },
      get height() {
        return get(heightPx);
      },
      get mondayStart() {
        return get(isMondayStart);
      },
      get dir() {
        return get(dirValue);
      },
      get locale() {
        return $$props.locale;
      }
    });
    pop();
  }
  const CalendarWidgetClass = asClassComponent(CalendarWidget);
  class DayCalendarElement extends HTMLElement {
    instance = null;
    static get observedAttributes() {
      return ["api", "events", "theme", "view", "height", "locale", "dir", "mondaystart", "headers"];
    }
    connectedCallback() {
      if (this.instance) return;
      this.instance = new CalendarWidgetClass({
        target: this,
        props: this.readProps()
      });
    }
    disconnectedCallback() {
      this.instance?.$destroy();
      this.instance = null;
    }
    attributeChangedCallback(name, _oldValue, newValue) {
      if (!this.instance) return;
      this.instance.$set({
        [name]: newValue ?? void 0
      });
    }
    readProps() {
      return {
        api: this.getAttribute("api") ?? void 0,
        events: this.getAttribute("events") ?? void 0,
        theme: this.getAttribute("theme") ?? void 0,
        view: this.getAttribute("view") ?? void 0,
        height: this.getAttribute("height") ?? void 0,
        locale: this.getAttribute("locale") ?? void 0,
        dir: this.getAttribute("dir") ?? void 0,
        mondaystart: this.getAttribute("mondaystart") ?? void 0,
        headers: this.getAttribute("headers") ?? void 0
      };
    }
  }
  if (!customElements.get("day-calendar")) {
    customElements.define("day-calendar", DayCalendarElement);
  }
})();
