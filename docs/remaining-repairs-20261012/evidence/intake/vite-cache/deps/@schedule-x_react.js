import { r as __toESM } from "./rolldown-runtime-DC62tzP2.js";
import { o as createCalendar } from "./core-Cb_QJZvB.js";
import { t as require_react } from "./react.js";
import { t as require_jsx_runtime } from "./jsx-runtime-DMooYQPS.js";
import { t as require_react_dom } from "./react-dom-CZ3R3u6D.js";
//#region ../capiro-followup/node_modules/@schedule-x/react/dist/index.js
var import_jsx_runtime = require_jsx_runtime();
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom(), 1);
var createCustomComponentFn = (setCustomComponent, customComponent) => (wrapperElement, props) => {
	setCustomComponent({
		Component: (0, import_react.createElement)(customComponent, props),
		wrapperElement
	});
};
function ScheduleXCalendar({ calendarApp, customComponents }) {
	const [randomId, setRandomId] = (0, import_react.useState)("");
	const [customComponentsMeta, setCustomComponentsMeta] = (0, import_react.useState)([]);
	const setComponent = (component) => {
		setCustomComponentsMeta((prev) => {
			var _a, _b;
			const ccid = (_b = (_a = component.wrapperElement) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.ccid;
			if (!ccid) return prev;
			const newComponents = [...prev];
			const existingComponent = newComponents.find((c) => {
				var _a, _b;
				return ((_b = (_a = c.wrapperElement) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.ccid) === ccid;
			});
			if (existingComponent) newComponents.splice(newComponents.indexOf(existingComponent), 1);
			return [...newComponents, component];
		});
	};
	(0, import_react.useEffect)(() => {
		setRandomId("sx" + Math.random().toString(36).substring(2, 11));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!calendarApp) return;
		for (const [componentName, Component] of Object.entries(customComponents || {})) {
			if (!Component) continue;
			calendarApp._setCustomComponentFn(componentName, createCustomComponentFn(setComponent, Component));
		}
		const calendarElement = document.getElementById(randomId);
		if (!calendarElement) return;
		calendarApp.render(calendarElement);
		return () => {
			calendarApp.destroy();
		};
	}, [
		calendarApp,
		customComponents,
		randomId
	]);
	return (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [(0, import_jsx_runtime.jsx)("div", {
		className: "sx-react-calendar-wrapper",
		id: randomId
	}), customComponentsMeta.map(({ Component, wrapperElement }) => {
		return (0, import_react_dom.createPortal)(Component, wrapperElement);
	})] }) });
}
function useCalendarApp(config, plugins) {
	const [calendarApp, setCalendarApp] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setCalendarApp(createCalendar(config, plugins));
	}, []);
	return calendarApp;
}
function useNextCalendarApp(config, plugins) {
	const [calendarApp, setCalendarApp] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (typeof window !== "undefined") setCalendarApp(createCalendar(config, plugins));
	}, []);
	return calendarApp;
}
var usePlugin = (plugin) => {
	if ("undefined" === typeof window) throw new Error("usePlugin can only be used in the browser. You need to wrap all logic for the calendar in a client side component.");
	const [pluginInstance, setPluginInstance] = (0, import_react.useState)();
	(0, import_react.useEffect)(() => {
		setPluginInstance(plugin);
	}, []);
	return pluginInstance;
};
//#endregion
export { ScheduleXCalendar, useCalendarApp, useNextCalendarApp, usePlugin };
