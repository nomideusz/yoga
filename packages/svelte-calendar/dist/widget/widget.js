/**
 * Widget entry point — registers <day-calendar> as a custom element.
 *
 * This file is the entry point for the standalone widget bundle (widget.js).
 * Import it via a <script> tag on any HTML page.
 */
import { asClassComponent } from 'svelte/legacy';
import CalendarWidget from './CalendarWidget.svelte';
const CalendarWidgetClass = asClassComponent(CalendarWidget);
class DayCalendarElement extends HTMLElement {
    instance = null;
    static get observedAttributes() {
        return ['api', 'events', 'theme', 'view', 'height', 'locale', 'dir', 'mondaystart', 'headers'];
    }
    connectedCallback() {
        if (this.instance)
            return;
        this.instance = new CalendarWidgetClass({
            target: this,
            props: this.readProps(),
        });
    }
    disconnectedCallback() {
        this.instance?.$destroy();
        this.instance = null;
    }
    attributeChangedCallback(name, _oldValue, newValue) {
        if (!this.instance)
            return;
        this.instance.$set({
            [name]: newValue ?? undefined,
        });
    }
    readProps() {
        return {
            api: this.getAttribute('api') ?? undefined,
            events: this.getAttribute('events') ?? undefined,
            theme: this.getAttribute('theme') ?? undefined,
            view: this.getAttribute('view') ?? undefined,
            height: this.getAttribute('height') ?? undefined,
            locale: this.getAttribute('locale') ?? undefined,
            dir: this.getAttribute('dir') ?? undefined,
            mondaystart: this.getAttribute('mondaystart') ?? undefined,
            headers: this.getAttribute('headers') ?? undefined,
        };
    }
}
if (!customElements.get('day-calendar')) {
    customElements.define('day-calendar', DayCalendarElement);
}
