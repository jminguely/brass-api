const moment = require("moment").locale("fr_FR");

function formatDate(startDate, endDate) {
  let date = "";
  if (startDate.isSame(endDate, "day")) {
    date = `
        ${startDate.format("DD.MM.YYYY")}<br/>
        ${startDate.format("HH:mm")}—${endDate.format("HH:mm")}
      `;
  } else {
    date = `
        ${startDate.format("DD.MM.YYYY, HH:mm")} — <br/>
        ${endDate.format("DD.MM.YYYY, HH:mm")}
      `;
  }
  return date;
}

module.exports = formatDate;
