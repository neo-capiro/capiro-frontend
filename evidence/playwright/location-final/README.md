# Portfolio location detail · Figma 3.4

Design frame: [District details · Arsenal-1](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-%E2%80%94-Portfolio?node-id=1064-159626). Reference image: [location-detail-1064-159626.png](../../figma/location-detail-1064-159626.png).

The [1440 × 1040 browser capture](government-location-profil-aa4ff--desktop-location-hierarchy/location-verification-desktop.png) uses synthetic test data with a missing street address. The first card matches the frame's measured x=439, y=223, width=778 layout, has the physical-presence eyebrow and location hierarchy, and shows the address-verification warning. Its lower edge is y=892 versus y=891 in the Figma render. Actual member and district text comes from the test's typed API responses; production values remain source-backed.

The original source metadata, address resolution actions, candidate review, editor, and remove confirmation remain available after the first location card. The backend facility record does not provide a facility type or construction status, and committee details still require an explicit public-directory read. Those details cannot be copied from Figma's Anduril example into the live profile.

Focused checks passed: the location hierarchy and geometry browser test; saved location/editor navigation; geocoding candidate, district resolution, retry and failure behavior; and remove confirmation after a rejected delete. TypeScript and focused ESLint checks passed. No live backend or authentication path was exercised.
