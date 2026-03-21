export const fetchCityBoundary = async (cityName: string) => {
  const query = `[out:json][timeout:25];(relation["boundary"="administrative"]["name"="${cityName}"];);out geom;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.elements && data.elements.length > 0) {
      const element = data.elements[0];
      // Outer boundary members ko ek single array mein merge karna
      const coords = element.members
        .filter((m: any) => m.role === 'outer' && m.geometry)
        .flatMap((m: any) => m.geometry.map((g: any) => [g.lon, g.lat]));
      
      // Close the polygon if not closed
      if (coords[0] !== coords[coords.length - 1]) coords.push(coords[0]);

      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: { name: cityName }
      };
    }
    return null;
  } catch (e) { return null; }
};
