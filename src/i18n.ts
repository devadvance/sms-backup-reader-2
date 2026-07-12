import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      sidebar: {
        title: 'SMS Backup Reader',
        readingXml: 'Reading XML...',
        uploadButton: 'Upload SMS Backup XML',
        clearButton: 'Clear Loaded Archive',
        searchPlaceholder: 'Search conversations...',
        errorParsing: 'Error parsing backup file',
        countryCodeLabel: 'Country Code Override',
        noOverride: 'No Override',
        uploadVcfButton: 'Load Contacts (VCF)...',
        exportAllCsv: 'Export All (CSV)',
        exportAllTxt: 'Export All (TXT)'
      },
      header: {
        selectPrompt: 'Select a conversation to begin reading',
        exportCsv: 'Export CSV',
        exportTxt: 'Export Text',
        messagesCount_one: '1 message',
        messagesCount_other: '{{count}} messages',
        toggleTheme: 'Toggle Theme'
      },
      messageThread: {
        noConversationSelectedTitle: 'No Conversation Selected',
        noConversationSelectedDesc:
          'Select a chat from the sidebar or upload a new SMS backup file to view your archive.',
        emptyConversationTitle: 'Empty Conversation',
        emptyConversationDesc: 'There are no messages in this conversation.',
        attachmentLoading: 'Loading attachment {{name}}...',
        attachmentDownload: 'Download',
        attachmentError: 'Failed to load attachment {{name}}',
        unknownSender: 'Unknown',
        contactCard: 'Contact Card',
        vcardName: 'Name',
        vcardPhone: 'Phone',
        vcardEmail: 'Email'
      },
      threadList: {
        noConversationsFound: 'No conversations found'
      }
    }
  },
  es: {
    translation: {
      sidebar: {
        title: 'SMS Backup Reader',
        readingXml: 'Leyendo XML...',
        uploadButton: 'Subir XML de Respaldo de SMS',
        clearButton: 'Borrar Archivo Cargado',
        searchPlaceholder: 'Buscar conversaciones...',
        errorParsing: 'Error al analizar el archivo de respaldo',
        countryCodeLabel: 'Anulación de código de país',
        noOverride: 'Sin anulación',
        uploadVcfButton: 'Cargar contactos (VCF)...',
        exportAllCsv: 'Exportar Todo (CSV)',
        exportAllTxt: 'Exportar Todo (TXT)'
      },
      header: {
        selectPrompt: 'Selecciona una conversación para comenzar a leer',
        exportCsv: 'Exportar CSV',
        exportTxt: 'Exportar Texto',
        messagesCount_one: '1 mensaje',
        messagesCount_other: '{{count}} mensajes',
        toggleTheme: 'Alternar Tema'
      },
      messageThread: {
        noConversationSelectedTitle: 'Ninguna Conversación Seleccionada',
        noConversationSelectedDesc:
          'Selecciona un chat de la barra lateral o sube un nuevo archivo de respaldo de SMS para ver tu archivo.',
        emptyConversationTitle: 'Conversación Vacía',
        emptyConversationDesc: 'No hay mensajes en esta conversación.',
        attachmentLoading: 'Cargando archivo adjunto {{name}}...',
        attachmentDownload: 'Descargar',
        attachmentError: 'Error al cargar el archivo adjunto {{name}}',
        unknownSender: 'Desconocido',
        contactCard: 'Tarjeta de Contacto',
        vcardName: 'Nombre',
        vcardPhone: 'Teléfono',
        vcardEmail: 'Correo'
      },
      threadList: {
        noConversationsFound: 'No se encontraron conversaciones'
      }
    }
  },
  fr: {
    translation: {
      sidebar: {
        title: 'SMS Backup Reader',
        readingXml: 'Lecture du fichier XML...',
        uploadButton: 'Télécharger le fichier XML de sauvegarde SMS',
        clearButton: "Effacer l'archive chargée",
        searchPlaceholder: 'Rechercher des conversations...',
        errorParsing: "Erreur lors de l'analyse du fichier de sauvegarde",
        countryCodeLabel: 'Remplacement du code pays',
        noOverride: 'Pas de remplacement',
        uploadVcfButton: 'Charger les contacts (VCF)...',
        exportAllCsv: 'Exporter tout (CSV)',
        exportAllTxt: 'Exporter tout (TXT)'
      },
      header: {
        selectPrompt: 'Sélectionnez une conversation pour commencer la lecture',
        exportCsv: 'Exporter en CSV',
        exportTxt: 'Exporter en texte',
        messagesCount_one: '1 message',
        messagesCount_other: '{{count}} messages',
        toggleTheme: 'Changer de thème'
      },
      messageThread: {
        noConversationSelectedTitle: 'Aucune conversation sélectionnée',
        noConversationSelectedDesc:
          'Sélectionnez une discussion dans la barre latérale ou téléchargez un nouveau fichier de sauvegarde SMS pour afficher vos archives.',
        emptyConversationTitle: 'Conversation vide',
        emptyConversationDesc: "Il n'y a aucun message dans cette conversation.",
        attachmentLoading: 'Chargement de la pièce jointe {{name}}...',
        attachmentDownload: 'Télécharger',
        attachmentError: 'Échec du chargement de la pièce jointe {{name}}',
        unknownSender: 'Inconnu',
        contactCard: 'Carte de contact',
        vcardName: 'Nom',
        vcardPhone: 'Téléphone',
        vcardEmail: 'E-mail'
      },
      threadList: {
        noConversationsFound: 'Aucune conversation trouvée'
      }
    }
  },
  hi: {
    translation: {
      sidebar: {
        title: 'SMS Backup Reader',
        readingXml: 'एक्सएमएल पढ़ रहा है...',
        uploadButton: 'एसएमएस बैकअप एक्सएमएल अपलोड करें',
        clearButton: 'लोडेड संग्रह साफ़ करें',
        searchPlaceholder: 'बातचीत खोजें...',
        errorParsing: 'बैकअप फ़ाइल पार्स करने में त्रुटि',
        countryCodeLabel: 'कंट्री कोड ओवरराइड',
        noOverride: 'कोई ओवरराइड नहीं',
        uploadVcfButton: 'संपर्क लोड करें (वीसीएफ)...',
        exportAllCsv: 'सभी निर्यात करें (CSV)',
        exportAllTxt: 'सभी निर्यात करें (TXT)'
      },
      header: {
        selectPrompt: 'पढ़ना शुरू करने के लिए कोई बातचीत चुनें',
        exportCsv: 'सीएसवी निर्यात करें',
        exportTxt: 'टेक्स्ट निर्यात करें',
        messagesCount_one: '1 संदेश',
        messagesCount_other: '{{count}} संदेश',
        toggleTheme: 'थीम बदलें'
      },
      messageThread: {
        noConversationSelectedTitle: 'कोई बातचीत नहीं चुनी गई',
        noConversationSelectedDesc:
          'अपने संग्रह को देखने के लिए साइडबार से एक चैट चुनें या एक नई एसएमएस बैकअप फ़ाइल अपलोड करें।',
        emptyConversationTitle: 'खाली बातचीत',
        emptyConversationDesc: 'इस बातचीत में कोई संदेश नहीं हैं।',
        attachmentLoading: 'अनुलग्नक {{name}} लोड हो रहा है...',
        attachmentDownload: 'डाउनलोड करें',
        attachmentError: 'अनुलग्नक {{name}} लोड करने में विफल',
        unknownSender: 'अज्ञात',
        contactCard: 'संपर्क कार्ड',
        vcardName: 'नाम',
        vcardPhone: 'फ़ोन',
        vcardEmail: 'ईमेल'
      },
      threadList: {
        noConversationsFound: 'कोई बातचीत नहीं मिली'
      }
    }
  },
  te: {
    translation: {
      sidebar: {
        title: 'SMS Backup Reader',
        readingXml: 'XML చదువుతోంది...',
        uploadButton: 'SMS బ్యాకప్ XML అప్‌లోడ్ చేయండి',
        clearButton: 'లోడ్ చేసిన ఆర్కైవ్‌ను తొలగించండి',
        searchPlaceholder: 'సంభాషణలను శోధించండి...',
        errorParsing: 'బ్యాకప్ ఫైల్‌ను పార్స్ చేయడంలో లోపం',
        countryCodeLabel: 'కంట్రీ కోడ్ ఓవర్‌రైడ్',
        noOverride: 'ఓవర్‌రైడ్ లేదు',
        uploadVcfButton: 'కాంటాక్ట్‌లను లోడ్ చేయి (VCF)...',
        exportAllCsv: 'అన్నీ ఎగుమతి చేయి (CSV)',
        exportAllTxt: 'అన్నీ ఎగుమతి చేయి (TXT)'
      },
      header: {
        selectPrompt: 'చదవడం ప్రారంభించడానికి ఒక సంభాషణను ఎంచుకోండి',
        exportCsv: 'CSV ఎగుమతి చేయి',
        exportTxt: 'Text ఎగుమతి చేయి',
        messagesCount_one: '1 సందేశం',
        messagesCount_other: '{{count}} సందేశాలు',
        toggleTheme: 'థీమ్‌ను మార్చు'
      },
      messageThread: {
        noConversationSelectedTitle: 'సంభాషణను ఎంచుకోలేదు',
        noConversationSelectedDesc:
          'మీ ఆర్కైవ్‌ను చూడటానికి సైడ్‌బార్ నుండి చాట్‌ను ఎంచుకోండి లేదా కొత్త SMS బ్యాకప్ ఫైల్‌ను అప్‌లోడ్ చేయండి.',
        emptyConversationTitle: 'ఖాళీ సంభాషణ',
        emptyConversationDesc: 'ఈ సంభాషణలో సందేశాలు లేవు.',
        attachmentLoading: 'అటాచ్‌మెంట్ {{name}} లోడ్ అవుతోంది...',
        attachmentDownload: 'డౌన్ లోడ్',
        attachmentError: 'అటాచ్‌మెంట్ {{name}} లోడ్ చేయడం విఫలమైంది',
        unknownSender: 'అపరిచితం',
        contactCard: 'కాంటాక్ట్ కార్డ్',
        vcardName: 'పేరు',
        vcardPhone: 'ఫోన్',
        vcardEmail: 'ఈమెయిల్'
      },
      threadList: {
        noConversationsFound: 'సంభాషణలు ఏవీ కనుగొనబడలేదు'
      }
    }
  }
};

const savedLng = localStorage.getItem('lng') || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lng', lng);
});

export default i18n;
