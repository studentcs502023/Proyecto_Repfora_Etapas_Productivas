import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Quasar, Notify, Dialog } from 'quasar';
import quasarLang from 'quasar/lang/es';

// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css';
import '@quasar/extras/fontawesome-v6/fontawesome-v6.css';

// Import Quasar css
import 'quasar/src/css/index.sass';

// Import custom app styles
import './css/app.scss';

import App from './App.vue';
import router from './router';

console.log('🚀 Iniciando Aplicación REPFORA...');
const myApp = createApp(App);

myApp.use(createPinia());
myApp.use(router);

myApp.use(Quasar, {
  plugins: {
    Notify,
    Dialog
  },
  lang: quasarLang,
});

myApp.mount('#app');
