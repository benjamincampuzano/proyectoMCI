export const WHATSAPP_TEMPLATES = {
  Bienvenida: {
    A: '¡Hola [Nombre]! 👋 Qué alegría que nos acompañaras hoy en [Nombre de la Iglesia]. Esperamos que te hayas sentido como en casa. ¡Bendiciones!',
    B: 'Hola [Nombre], soy [Nombre del Líder] de la iglesia. Me dio mucho gusto conocerte hoy. Si tienes alguna duda o necesitas algo, aquí estoy para servirte. 😊',
    C: '¡Hola [Nombre]! Gracias por venir hoy con [Nombre de la persona que lo invitó]. Fue un gusto tenerte con nosotros. ¡Te esperamos el próximo domingo!',
  },
  Consolidacion: {
    A: 'Hola [Nombre], espero que estés teniendo una excelente semana. ✨ Me quedé pensando en ti y quería saludarte. ¿Cómo va todo?',
    B: "¡Hola [Nombre]! En la iglesia tenemos grupos pequeños llamados 'Células' donde nos conocemos mejor y estudiamos la Biblia. Tenemos una muy cerca de tu casa, ¿te gustaría visitarla esta semana?",
    C: 'Hola [Nombre], te saludo con mucho cariño. Queríamos saber si hay algo por lo que podamos estar orando por ti o tu familia esta semana. 🙏',
  },
  Integracion: {
    A: '¡Hola [Nombre]! Estamos iniciando un curso básico para conocer más sobre la fe y la Biblia. Creo que te gustaría mucho. ¿Te gustaría que te enviara la información? 📖',
    B: '¡Hola [Nombre]! Se acerca nuestra [Nombre de la Convención/Evento] y me encantaría que fueras mi invitado especial. Será un tiempo increíble. ¿Cuento contigo? 🎫',
  },
  Recuperacion: {
    A: '¡Hola [Nombre]! Te hemos extrañado los últimos domingos. Espero que todo esté bien. ¡Te enviamos un abrazo fuerte! 🤗',
    B: 'Hola [Nombre], pasaba por aquí para decirte que te recordamos con cariño en la iglesia. Ojalá podamos vernos pronto. ¡Dios te bendiga!',
  },
};

const getCleanName = (name) => {
  if (!name) return '';
  const first = name.trim().split(' ')[0].toLowerCase();
  return first.charAt(0).toUpperCase() + first.slice(1);
};

export const buildWhatsAppMessage = (stage, templateKey, guest, user) => {
  if (!stage || !templateKey || !guest) return '';
  let msg = WHATSAPP_TEMPLATES[stage][templateKey];
  msg = msg.replace(/\[Nombre\]/g, getCleanName(guest.name));
  if (user) msg = msg.replace(/\[Nombre del Líder\]/g, getCleanName(user.profile?.fullName || user.email));
  if (guest.invitedBy?.fullName) {
    msg = msg.replace(/\[Nombre de la persona que lo invitó\]/g, getCleanName(guest.invitedBy.fullName));
  } else {
    msg = msg.replace(/ con \[Nombre de la persona que lo invitó\]/g, '');
    msg = msg.replace(/\[Nombre de la persona que lo invitó\]/g, 'nosotros');
  }
  msg = msg.replace(/\[Nombre de la Iglesia\]/g, 'la iglesia');
  msg = msg.replace(/\[Nombre de la Convención\/Evento\]/g, 'próxima reunión');
  return msg;
};
