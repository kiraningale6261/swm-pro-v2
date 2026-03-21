// src/lib/osm.ts

export const fetchCityBoundary = async (cityName: string) => {
  // Overpass API Query: City ki administrative boundary nikalne ke liye
  const query = `
    [out:json][timeout:25];
    (
      relation["boundary"="administrative"]["name"="${cityName}"];
    );
    out geom;
  `;
  
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("OSM Server Busy");
    
    const data = await response.json();
    
    if (data.elements && data.elements.length > 0) {
      const element = data.elements[0];
      
      // Coordinates ko Leaflet/Turf format mein convert karna
      // Note: Relation mein multiple ways ho sakte hain, hum unhe merge karte hain
      const coordinates = element.members
        .filter((m: any) => m.role === 'outer' && m.geometry)
        .map((m: any) => m.geometry.map((g: any) => [g.lon, g.lat]));

      if (coordinates.length === 0) return null;

      // Business Logic: GeoJSON Feature return karna taaki Partition ho sake
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [coordinates[0]] // Pehla outer ring pakad rahe hain
        },
        properties: { 
          name: cityName,
          osm_id: element.id 
        }
      };
    }
    return null;
  } catch (error) {
    console.error("OSM Error:", error);
    return null;
  }
};
