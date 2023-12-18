export default () => {
  var elems = document.querySelectorAll(".datepicker");
  var instances = M.Datepicker.init(elems, {
    autoClose: true,
    format: "dd.mm.yyyy",
    showClearBtn: true,
    firstDay: 1,
    showMonthAfterYear: true,
    i18n: {
      cancel: "Annuler",
      clear: "Effacer",
      months: [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ],
      monthsShort: [
        "Jan",
        "Fév",
        "Mar",
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Aoû",
        "Sept",
        "Oct",
        "Nov",
        "Déc",
      ],
      weekdays: [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ],
      weekdaysShort: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
      weekdaysAbbrev: ["D", "L", "Ma", "Me", "J", "V", "S"],
    },
  });

  const list = document.querySelectorAll(".list-filterable");

  const filters = {};

  function init() {
    instances.forEach((instance) => {
      instance.el.addEventListener("change", function () {
        onPickerChange(instance);
      });
    });
  }

  function onPickerChange(instance) {
    const value = instance.el.value.split(".");

    if (value != "") {
      const date = `${value[1]}.${value[0]}.${value[2]}`;
      filters[instance.el.dataset.filter] = new Date(date).getTime();
    } else {
      delete filters[instance.el.dataset.filter];
    }

    if (Object.keys(filters).length === 0 && filters.constructor === Object) {
      for (var i = 0; i < list.length; ++i) {
        list[i].classList.remove("hide");
      }
    } else {
      for (var i = 0; i < list.length; ++i) {
        let displayStatus = true;
        for (const filterKey in filters) {
          if (filterKey === "start") {
            if (list[i].dataset["date"] < filters[filterKey]) {
              displayStatus = false;
            }
          } else if (filterKey === "end") {
            if (list[i].dataset["date"] > filters[filterKey]) {
              displayStatus = false;
            }
          }
        }

        if (displayStatus) list[i].classList.remove("hide");
        else list[i].classList.add("hide");
      }
    }
  }

  init();
};
