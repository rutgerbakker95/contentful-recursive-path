import { createApp } from "vue";

import { init, locations } from "@contentful/app-sdk";

import FieldLocation from "./locations/FieldLocation.vue";
import LocalhostWarning from "./components/LocalhostWarning.vue";

if (process.env.NODE_ENV === "development" && window.self === window.top) {
  // You can remove this if block before deploying your app
  createApp(LocalhostWarning).mount("#app");
} else {
  init((sdk) => {
    const locationsMap = {
      [locations.LOCATION_ENTRY_FIELD]: FieldLocation,
    };

    // Select a component depending on a location in which the app is rendered.
    Object.entries(locationsMap).forEach(([locationKey, Component]) => {
      if (sdk.location.is(locationKey)) {
        createApp(Component, { sdk }).mount("#app");
      }
    });
  });
}
