import React from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

import { Map } from "../../components/Map";

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";

const MapPage = () => {
  return (
    <APIProvider
      apiKey={googleMapsApiKey}
      onLoad={() => console.log("Maps API has loaded.")}
    >
      <Map />
    </APIProvider>
  );
};

export { MapPage };
