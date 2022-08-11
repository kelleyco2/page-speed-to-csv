const axios = require("axios");
const fastcsv = require("fast-csv");
const fs = require("fs");
const urls = require("./urls");
const date = new Date();
const month = date.getMonth() + 1;
const day = date.getDate();
const year = date.getFullYear();
const ws_desktop = fs.createWriteStream(
  `desktop-audit-${month}-${day}-${year}.csv`
);
const ws_mobile = fs.createWriteStream(
  `mobile-audit-${month}-${day}-${year}.csv`
);

const API_KEY = "AIzaSyBOgVpcWTTAq3O9sjqORR9H-9BVbXLQdio";

// const paths = ["/", "/ppc-management-services/google-ads/"];

const handleResponse = (pageResponse, isMobile) =>
  fastcsv
    .write(
      pageResponse.map((response) => {
        if (response.value?.data) {
          const data = response.value.data;
          console.log(`running ${isMobile ? "mobile" : "desktop"}: ${data.id}`);
          const cruxMetrics = {
            "CUMULATIVE LAYOUT SHIFT":
              data.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE
                .category,
            "First Contentful Paint":
              data.loadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS.category,
            "First Input Delay":
              data.loadingExperience.metrics.FIRST_INPUT_DELAY_MS.category,
            "LARGEST CONTENTFUL PAINT":
              data.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS
                .category,
          };
          const lighthouse = data.lighthouseResult;
          const lighthouseMetrics = {
            "First Contentful Paint":
              lighthouse.audits["first-contentful-paint"].displayValue,
            "Speed Index": lighthouse.audits["speed-index"].displayValue,
            "Time To Interactive":
              lighthouse.audits["interactive"].displayValue,
            "First Meaningful Paint":
              lighthouse.audits["first-meaningful-paint"].displayValue,
          };
          console.log("done running" + data.id);
          return {
            "Page Tested": data.id,
            ...cruxMetrics,
            ...lighthouseMetrics,
          };
        }
      }),
      { headers: true }
    )
    .pipe(isMobile ? ws_mobile : ws_desktop);

const goGetEm = (urls) => {
  Promise.allSettled(
    urls.map(
      async (path) =>
        await axios.get(
          `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${path}&key=${API_KEY}`
        )
    )
  ).then((pageResponse) => {
    handleResponse(pageResponse, false);
    Promise.allSettled(
      urls.map(
        async (path) =>
          await axios.get(
            `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${path}&strategy=mobile&key=${API_KEY}`
          )
      )
    ).then((pageResponse) => handleResponse(pageResponse, true));
  });
};

goGetEm(urls);
