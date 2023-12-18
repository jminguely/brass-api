import "materialize-css/dist/js/materialize.js";
import datepicker from "./components/datepicker";
import table from "./components/table";
import select from "./components/select";

document.addEventListener("DOMContentLoaded", function () {
  datepicker();
  table();
  select();
});
