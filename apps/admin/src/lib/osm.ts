// src/lib/osm.ts

/**
 * Ye function OpenStreetMap (OSM) se official city boundary fetch karta hye.
 * Isse manual drawing ki zaroorat nahi padti aur partition error nahi aata.
 */
export const fetchCityBoundary = async (cityName: string) => {
  // Overpass API Query: Administrative boundary nikalne ke liye
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
    if (!response.ok) throw new Error("OSM Server is busy");
    
    const data = await response.json();
    
    if (data.elements && data.elements.length > 0) {
      const element = data.elements[0];
      
      // Coordinates ko extract karna (outer boundary members)
      const coordinates = element.members
        .filter((m: any) => m.role === 'outer' && m.geometry)
        .map((m: any) => m.geometry.map((g: any) => [g.lon, g.lat]));

      if (coordinates.length === 0) return null;

      // GeoJSON Polygon return karna taaki Turf.js ise 10 Wards me divide kar sake
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [coordinates[0]] // Pehli outer boundary le rahe hain
        },
        properties: { 
          name: cityName,
          osm_id: element.id 
        }
      };
    }
    return null;
  } catch (error) {
    console.error("OSM Fetch Error:", error);
    return null;
  }
};
