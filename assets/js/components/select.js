export default () => {
  const elems = document.querySelectorAll('select');
  const instances = M.FormSelect.init(elems);
  const list = document.querySelectorAll('.list-filterable');
  const filters = {};
  
  function init() {
    instances.forEach((instance) => {
      instance.el.addEventListener('change', function() { onSelectChange(instance) });
      onSelectChange(instance);
    });
  }

  function onSelectChange(instance) {
    const value = instance.el.value;

    if (value != "") {
      filters[instance.el.dataset.filter] = value;
    } else {
      delete filters[instance.el.dataset.filter];
    }

    if (Object.keys(filters).length === 0 && filters.constructor === Object) {
      for (var i = 0; i < list.length; ++i) {
        list[i].classList.remove('hide');
      }
    } else {
      for (var i = 0; i < list.length; ++i) {
        let displayStatus = undefined;
        for (const filterKey in filters) {
          if (displayStatus !== false) {
            if (filters[filterKey] == list[i].dataset[filterKey]){
              displayStatus = true
            } else {
              displayStatus = false
            }
          }

        }

        if (displayStatus) list[i].classList.remove('hide');
        else list[i].classList.add('hide');
      }
    }
  }

  init();
};
