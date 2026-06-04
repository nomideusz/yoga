export function createJmapAdapter(client, options) {
    const getAccountId = options.getAccountId;
    const timeZone = options.timeZone ?? 'Etc/UTC';
    function parseIsoDuration(duration) {
        const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(duration);
        if (!match)
            return 0;
        const days = Number(match[1] ?? 0);
        const hours = Number(match[2] ?? 0);
        const minutes = Number(match[3] ?? 0);
        const seconds = Number(match[4] ?? 0);
        return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
    }
    function parseEventStart(event) {
        if (event.utcStart)
            return new Date(event.utcStart);
        if (event.start) {
            if (event.showWithoutTime) {
                const [datePart] = event.start.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                return new Date(year, month - 1, day);
            }
            return new Date(event.start);
        }
        return new Date();
    }
    function parseEventEnd(event, start) {
        if (event.utcEnd)
            return new Date(event.utcEnd);
        if (event.duration) {
            return new Date(start.getTime() + parseIsoDuration(event.duration));
        }
        if (event.showWithoutTime) {
            return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
        }
        return new Date(start.getTime() + 60 * 60 * 1000);
    }
    function firstLocation(event) {
        if (!event.locations)
            return undefined;
        for (const location of Object.values(event.locations)) {
            if (location.name)
                return location.name;
            if (location.description)
                return location.description;
        }
        return undefined;
    }
    function resolveCalendars() {
        const cal = options.calendars;
        if (typeof cal === 'function')
            return cal();
        return cal ?? [];
    }
    return {
        async fetchEvents(range) {
            const accountId = getAccountId();
            if (!accountId)
                return [];
            const filter = {
                after: range.start.toISOString(),
                before: range.end.toISOString()
            };
            if (options.calendarId) {
                filter.inCalendar = options.calendarId;
            }
            const response = await client.request([
                [
                    'CalendarEvent/query',
                    {
                        accountId,
                        filter,
                        expandRecurrences: true,
                        timeZone,
                        limit: 500
                    },
                    'ceq'
                ],
                [
                    'CalendarEvent/get',
                    {
                        accountId,
                        '#ids': { resultOf: 'ceq', name: 'CalendarEvent/query', path: '/ids' },
                        properties: [
                            'id',
                            'calendarIds',
                            'title',
                            'description',
                            'start',
                            'duration',
                            'timeZone',
                            'showWithoutTime',
                            'utcStart',
                            'utcEnd',
                            'locations'
                        ]
                    },
                    'ceg'
                ]
            ]);
            const queryResponse = response.methodResponses?.find(r => r[0] === 'CalendarEvent/query' || r[2] === 'ceq');
            const getResponse = response.methodResponses?.find(r => r[0] === 'CalendarEvent/get' || r[2] === 'ceg');
            if (queryResponse?.[0] === 'error') {
                const error = queryResponse[1];
                throw new Error(error.description ?? error.type ?? 'CalendarEvent/query failed');
            }
            if (!getResponse || getResponse[0] === 'error') {
                return [];
            }
            const jmapEvents = getResponse[1].list ?? [];
            const currentCalendars = resolveCalendars();
            return jmapEvents.map((jmapEvent) => {
                const start = parseEventStart(jmapEvent);
                const end = parseEventEnd(jmapEvent, start);
                const calendarIds = Object.keys(jmapEvent.calendarIds ?? {});
                const associatedCal = currentCalendars.find((c) => calendarIds.includes(c.id));
                return {
                    id: jmapEvent.id,
                    title: jmapEvent.title?.trim() || '(No title)',
                    start,
                    end,
                    allDay: !!jmapEvent.showWithoutTime,
                    location: firstLocation(jmapEvent),
                    color: associatedCal?.color,
                    category: associatedCal?.name
                };
            });
        }
    };
}
