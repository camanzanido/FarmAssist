import { Colors } from '@/src/constants/colors';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export type MapPin = {
  key: string;
  city: string;
  lat: number;
  lng: number;
  details: string;
};

export type LeafletMapHandle = {
  focus: (key: string, bottomCover?: number) => void;
};

type Props = {
  pins: MapPin[];
  selectedKey: string | null;
  topInset?: number;
  bottomInset?: number;
  onPinPress?: (key: string) => void;
  onLoadError?: () => void;
  style?: StyleProp<ViewStyle>;
};

function buildHtml(topInset: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${Colors.surfaceAlt}; }
  .leaflet-top { top: ${topInset}px; }
  .leaflet-popup-content { font-family: -apple-system, Roboto, sans-serif; font-size: 13px; line-height: 1.45; color: ${Colors.ink}; margin: 10px 14px; }
  .leaflet-popup-content b { font-size: 14px; }
  .fa-details { color: ${Colors.inputText}; }
  .fa-pin { background: transparent; border: none; }
  .fa-inner { position: relative; width: 44px; height: 44px; }
  .fa-dot, .fa-ripple { position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; box-sizing: border-box; }
  .fa-dot { background: ${Colors.accent}; border: 2.5px solid #FFFFFF; box-shadow: 0 1px 4px rgba(10,59,40,0.45); transition: transform 0.2s, background 0.2s; }
  .fa-ripple { background: rgba(46,125,82,0.45); will-change: transform, opacity; animation: fa-ripple 2.2s ease-out infinite; }
  .fa-selected .fa-dot { background: ${Colors.ink}; transform: scale(1.3); }
  @keyframes fa-ripple { from { transform: scale(1); opacity: 0.6; } to { transform: scale(3.2); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .fa-ripple { animation: none; opacity: 0; } }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
  (function () {
    function post(msg) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
    if (typeof L === 'undefined') { post({ type: 'error' }); return; }

    var topInset = ${topInset};
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([12.8797, 121.7740], 6);
    L.control.attribution({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    var layer = L.layerGroup().addTo(map);
    var markers = {};
    var selected = null;

    function iconFor(isSelected) {
      var delay = (Math.random() * 2.2).toFixed(2);
      var delay2 = (Number(delay) + 1.1).toFixed(2);
      return L.divIcon({
        className: 'fa-pin' + (isSelected ? ' fa-selected' : ''),
        html: '<div class="fa-inner">' +
          '<span class="fa-ripple" style="animation-delay:' + delay + 's"></span>' +
          '<span class="fa-ripple" style="animation-delay:' + delay2 + 's"></span>' +
          '<span class="fa-dot"></span></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -10],
      });
    }

    function popupFor(p) {
      var el = document.createElement('div');
      var title = document.createElement('b');
      title.textContent = p.city;
      var body = document.createElement('div');
      body.className = 'fa-details';
      body.textContent = p.details;
      el.appendChild(title);
      el.appendChild(body);
      return el;
    }

    function setSelectedClass(key, on) {
      var m = markers[key];
      var el = m && m.getElement();
      if (el) el.classList.toggle('fa-selected', on);
    }

    window.farmassist = {
      setPins: function (pins, fit, bottomInset) {
        layer.clearLayers();
        markers = {};
        pins.forEach(function (p) {
          var m = L.marker([p.lat, p.lng], { icon: iconFor(p.key === selected) });
          m.bindPopup(popupFor(p));
          m.on('click', function () { post({ type: 'pin', key: p.key }); });
          m.addTo(layer);
          markers[p.key] = m;
        });
        if (fit && pins.length > 0) {
          if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 11);
          else map.fitBounds(pins.map(function (p) { return [p.lat, p.lng]; }), {
            paddingTopLeft: [36, 36 + topInset], paddingBottomRight: [36, 36 + bottomInset], maxZoom: 12,
          });
        }
      },
      select: function (key) {
        if (selected) setSelectedClass(selected, false);
        selected = key;
        if (key) setSelectedClass(key, true);
        else map.closePopup();
      },
      focus: function (key, bottomCover) {
        var m = markers[key];
        if (!m) return;
        window.farmassist.select(key);
        var zoom = Math.max(map.getZoom(), 11);
        var shift = Math.max(0, (bottomCover - topInset) / 2);
        var center = map.unproject(map.project(m.getLatLng(), zoom).add([0, shift]), zoom);
        map.flyTo(center, zoom, { duration: 0.6 });
        setTimeout(function () { if (selected === key) m.openPopup(); }, 650);
      },
    };
    post({ type: 'ready' });
  })();
</script>
</body>
</html>`;
}

export const LeafletMap = forwardRef<LeafletMapHandle, Props>(function LeafletMap(
  { pins, selectedKey, topInset = 0, bottomInset = 0, onPinPress, onLoadError, style },
  ref
) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const source = useMemo(() => ({ html: buildHtml(topInset) }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`try { ${js} } catch (e) {} true;`);
  }, []);

  const signature = pins.map(p => p.key).join('|');
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const fit = lastSignature.current !== signature;
    lastSignature.current = signature;
    run(`window.farmassist.setPins(${JSON.stringify(pins)}, ${fit}, ${bottomInset});`);
  }, [ready, pins, signature, bottomInset, run]);

  useEffect(() => {
    if (!ready) return;
    run(`window.farmassist.select(${JSON.stringify(selectedKey)});`);
  }, [ready, selectedKey, run]);

  useImperativeHandle(ref, () => ({
    focus: (key: string, bottomCover = 0) => run(`window.farmassist.focus(${JSON.stringify(key)}, ${bottomCover});`),
  }), [run]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string; key?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'error') onLoadError?.();
    else if (msg.type === 'pin' && msg.key) onPinPress?.(msg.key);
  };

  return (
    <WebView
      ref={webRef}
      source={source}
      style={[s.map, style]}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      onMessage={onMessage}
      onError={() => onLoadError?.()}
      setSupportMultipleWindows={false}
      overScrollMode="never"
      bounces={false}
    />
  );
});

const s = StyleSheet.create({
  map: { flex: 1, backgroundColor: Colors.surfaceAlt },
});
