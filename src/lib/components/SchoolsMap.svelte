<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  type SchoolPin = { id: string; name: string; lat: number; lng: number; address?: string };

  let {
    schools = [],
    userLocation = null,
    apiKey = '',
    onpinclick,
  }: {
    schools: SchoolPin[];
    userLocation: { lat: number; lng: number; label?: string } | null;
    apiKey: string;
    onpinclick?: (id: string) => void;
  } = $props();

  let mapEl: HTMLDivElement | undefined = $state();
  let loaded = $state(false);
  let error = $state(false);

  let map: google.maps.Map | undefined;
  let schoolMarkers: google.maps.Marker[] = [];
  let userMarker: google.maps.Marker | undefined;
  let openInfoWindow: google.maps.InfoWindow | undefined;

  const LIGHT_STYLES: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', stylers: [{ color: '#dce8f0' }] },
    { featureType: 'landscape', stylers: [{ color: '#f4f6f8' }] },
    { featureType: 'road', stylers: [{ visibility: 'simplified' }, { color: '#e8ecf0' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a95a5' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#d4dce4' }] },
  ];

  const DARK_STYLES: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#1a2233' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8d' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1521' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', stylers: [{ color: '#0f1521' }] },
    { featureType: 'landscape', stylers: [{ color: '#1a2233' }] },
    { featureType: 'road', stylers: [{ visibility: 'simplified' }, { color: '#253044' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8d' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#253044' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8d' }] },
  ];

  function isDarkMode(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function loadGoogleMaps(): Promise<void> {
    if ((window as any).google?.maps?.Map) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.maps?.Map) {
          resolve();
        } else {
          reject(new Error('Google Maps loaded but API not available'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  }

  function fitBounds() {
    if (!map || schools.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const school of schools) {
      bounds.extend({ lat: school.lat, lng: school.lng });
    }
    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
    }
    map.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });

    // Prevent zooming out too far for cities with spread-out schools
    google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      const zoom = map!.getZoom();
      if (zoom != null && zoom < 11) map!.setZoom(11);
    });
  }

  function initMap() {
    if (!mapEl) return;

    const dark = isDarkMode();
    const center = schools.length > 0
      ? { lat: schools[0].lat, lng: schools[0].lng }
      : userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 52.0, lng: 19.0 };

    map = new google.maps.Map(mapEl, {
      center,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
      },
      styles: dark ? DARK_STYLES : LIGHT_STYLES,
    });

    const markerColor = dark ? '#85b4e4' : '#3d7ce0';

    for (const school of schools) {
      const marker = new google.maps.Marker({
        position: { lat: school.lat, lng: school.lng },
        map,
        title: school.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: markerColor,
          fillOpacity: 0.85,
          strokeColor: dark ? '#1a2233' : '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoBg = dark ? '#1a2233' : '#fff';
      const infoText = dark ? '#e8edf4' : '#1a2233';
      const infoMuted = dark ? '#6b7a8d' : '#666';
      const infoContent = `<div style="font-family:sans-serif;padding:2px 0;background:${infoBg};color:${infoText}"><strong>${school.name}</strong>${school.address ? `<br><span style="font-size:0.85em;color:${infoMuted}">${school.address}</span>` : ''}</div>`;

      marker.addListener('click', () => {
        if (openInfoWindow) openInfoWindow.close();
        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        infoWindow.open(map, marker);
        openInfoWindow = infoWindow;
        onpinclick?.(school.id);
      });

      schoolMarkers.push(marker);
    }

    updateUserMarker();
    fitBounds();

    // Listen for color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      map?.setOptions({ styles: e.matches ? DARK_STYLES : LIGHT_STYLES });
    });
  }

  function updateUserMarker() {
    if (!map) return;

    if (userMarker) {
      userMarker.setMap(null);
      userMarker = undefined;
    }

    if (userLocation) {
      userMarker = new google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map,
        title: userLocation.label ?? t("your_location"),
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#e55050',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
      });
    }
  }

  $effect(() => {
    if (!apiKey || !mapEl) return;
    loadGoogleMaps()
      .then(() => {
        loaded = true;
        initMap();
      })
      .catch((err) => {
        console.error('[SchoolsMap]', err);
        error = true;
      });
  });

  $effect(() => {
    // Track userLocation reactively
    const _loc = userLocation;
    if (!map || !loaded) return;
    updateUserMarker();
    fitBounds();
  });
</script>

<div class="schools-map-wrap">
  <div class="schools-map" bind:this={mapEl}>
    {#if !loaded && !error}
      <div class="map-placeholder" aria-hidden="true">
        <span class="sf-loader" aria-hidden="true"></span>
        <span class="map-loading">{t("map_loading")}</span>
      </div>
    {/if}
    {#if error}
      <div class="map-placeholder">
        <span class="map-error">{t("map_error")}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .schools-map-wrap {
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .schools-map {
    width: 100%;
    height: 340px;
    background: var(--sf-frost, #eef2f7);
    position: relative;
  }

  @media (max-width: 767px) {
    .schools-map {
      height: 240px;
    }
  }

  .map-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .map-loading,
  .map-error {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-muted);
  }

  /* ── Dark mode: Google Maps zoom controls ── */
  @media (prefers-color-scheme: dark) {
    .schools-map :global(.gmnoprint button) {
      background: var(--sf-card, #1a2233) !important;
      color: var(--sf-dark, #e8edf4) !important;
      border-color: var(--sf-line, #253044) !important;
    }
    .schools-map :global(.gmnoprint button img) {
      filter: invert(1);
    }
    .schools-map :global(.gm-style .gm-style-mtc),
    .schools-map :global(.gmnoprint > div) {
      background: var(--sf-card, #1a2233) !important;
    }
    .schools-map :global(.gm-bundled-control .gmnoprint > div) {
      background: var(--sf-card, #1a2233) !important;
      border-color: var(--sf-line, #253044) !important;
    }
  }
</style>
