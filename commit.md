# Commit Message

```
fix(geofencing): fix create validation errors and add map panning on location search

- Fix trigger_type mapping: normalize 'enter' → 'entry' before sending to API
- Fix coordinates format: send flat [{lat, lng}] array for polygons instead of
  GeoJSON geometry object; send {lat, lng} for circle center instead of
  {latitude, longitude}
- Add normalizeCoordinates() and normalizeTriggerType() helpers in geofencing API
  client to handle legacy shapes from older code paths
- Fix edit page map: render existing polygon/circle boundary on load by handling
  the flat [{lat, lng}] coordinate format the API returns (was only handling GeoJSON)
- Fix MapCenterer to auto-fit map bounds for flat-array polygon coordinates
- Add location search → map pan: selecting an address from LocationAutocomplete
  now flies the map to that location on create, edit, and builder modal pages
- Add center prop to GeofenceMapEditor and GeofenceMap for programmatic panning
```

## Files Changed

| File | Changes |
|------|---------|
| `lib/api/geofencing.ts` | Added `normalizeTriggerType()` and `normalizeCoordinates()` helpers; applied to `createGeofence` and `updateGeofence` |
| `components/geofencing/GeofenceMapEditor.tsx` | Fixed `renderInitialLayer` and `MapCenterer` to handle flat `[{lat, lng}]` polygon format; added `MapPanner` component; added `center` prop |
| `components/geofencing/GeofenceMap.tsx` | Exposed `center` prop and passed through to `GeofenceMapEditor` |
| `components/geofencing/GeofenceBuilder.tsx` | Added `mapCenter` state; wired `LocationAutocomplete` onSelect to update map center |
| `app/(portal)/geofences/new/page.tsx` | Added `mapCenter` state; wired `LocationAutocomplete` onSelect to update map center |
| `app/(portal)/geofences/[id]/edit/page.tsx` | Added `mapCenter` state; wired `LocationAutocomplete` onSelect to update map center; added `center` to local props interface |
