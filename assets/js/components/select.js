export default () => {
  var elems = document.querySelectorAll('select');
  var instances = M.FormSelect.init(elems);
  
  instances.forEach((instance) => {
    instance.el.addEventListener('change', function(event) {
      
      const values = instance.getSelectedValues();

      console.log(values);
      
      if (values.length > 0) {
        const list = document.querySelectorAll(`[data-${instance.el.dataset.filter}]`);
        for (var i = 0; i < list.length; ++i) {
          list[i].classList.add('hide');
          instance.getSelectedValues().forEach(function(filterValue) {
            if (filterValue == list[i].dataset[instance.el.dataset.filter]) {
              list[i].classList.remove('hide');
            }
          });
        }
      } else {
        const list = document.querySelectorAll(`[data-${instance.el.dataset.filter}]`);
        for (var i = 0; i < list.length; ++i) {
          list[i].classList.remove('hide');
        }
      }
    });
  });

};
