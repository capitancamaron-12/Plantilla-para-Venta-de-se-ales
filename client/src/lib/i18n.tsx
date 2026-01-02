import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'es' | 'en';

const translations = {
  es: {
    nav: {
      overview: "Visión General",
      infrastructure: "Infraestructura",
      pricing: "Planes",
      dashboard: "Panel de Control",
      access_dashboard: "Ingresar",
      product: "Producto",
      company: "Compañía",
      legal: "Legal",
      about: "Acerca de",
      contact: "Contacto",
      privacy: "Privacidad",
      terms: "Términos de Servicio",
      documentation: "Documentación API",
      status: "Estado",
      security: "Seguridad",
      blog: "Blog",
      rights: "Todos los derechos reservados."
    },
    home: {
      new_feature: "Nuevo: Canales privados de señales Forex",
      title_1: "Infraestructura de",
      title_2: "Señales de Trading FX.",
      subtitle: "Reciba señales de trading de divisas en tiempo real con precisión institucional. API RESTful, alertas y retención configurable.",
      start_btn: "Iniciar Panel de Señales",
      docs_btn: "Documentación API",
      encryption: "Protección institucional",
      uptime: "Cobertura Forex 24/7",
      retention: "Historial configurable",
      control_title: "Control total sobre sus señales de trading de divisas.",
      control_desc: "TCorp Business proporciona señales FX fiables y baja latencia para operadores profesionales y equipos cuantitativos.",
      features: [
        "Señales FX basadas en análisis técnico y estadístico.",
        "Alertas en tiempo real con baja latencia.",
        "Integración API para trading algorítmico y backtesting."
      ],
      cards: {
        privacy: { title: "Precisión", desc: "Modelos calibrados para reducir falsos positivos en señales." },
        speed: { title: "Baja Latencia", desc: "Entrega de señales en <200ms mediante WebSockets." },
        scale: { title: "Escalable", desc: "Desde traders individuales hasta infraestructuras de equipo a nivel institucional." }
      },
      ads: {
        kicker: "Publicidad",
        title: "Espacios patrocinados",
        note: "Inventario disponible para partners",
        wide_label: "Banner 970x90",
        square_label: "Rectangulo 300x250",
        meta: "Espacio publicitario"
      },
      pricing_title: "Planes de Señales Forex",
      pricing_subtitle: "Precios claros para traders de divisas y equipos cuantitativos.",
      free_tier: {
        title: "Developer",
        desc: "Ideal para pruebas y usuarios individuales que requieren señales FX básicas.",
        features: ["Señales FX en tiempo real (básicas)", "Acceso API limitado", "Historial de 1 hora"],
        btn: "Comenzar"
      },
      pro_tier: {
        title: "Enterprise",
        desc: "Solución completa para equipos y empresas que requieren señales FX dedicadas y SLA.",
        features: ["Canales de señales FX privadas", "Límites y retención configurables", "Soporte SLA"],
        btn: "Actualizar a Enterprise",
        note: "Facturación anual disponible (contacto para precios)"
      }
    },
    inbox: {
      title: "Panel de Señales",
      subtitle: "Gestiona y consume señales de mercado en tiempo real.",
      system_online: "SISTEMA ONLINE",
      active_identity: "Fuente Activa",
      inbox_hint: "Tus señales aparecen en la columna izquierda. Selecciona una para ver los detalles.",
      search_placeholder: "escribe para buscar activos o usa @ para filtros",
      from_label: "Origen",
      sync: "Sync",
      reset: "Reset",
      new_info: "El botón Nuevo no borra la señal actual, solo genera una nueva.",
      inbox_header: "Señales",
      waiting: "Esperando transmisiones...",
      select_msg: "Seleccione una señal para ver los datos",
      public_domain: "Fuente Pública Detectada.",
      upgrade_msg: "Actualice para usar canales de señales privadas.",
      upgrade_btn: "Actualizar a Enterprise ($5/mo)",
      to: "Para",
      received_label: "Recibido",
      message_id_label: "ID",
      preview_label: "Vista previa",
      format_label: "Formato",
      size_label: "Tamano",
      format_html: "Gráfico",
      format_text: "Texto",
      print_label: "Imprimir",
      download_label: "Exportar",
      print_error: "No se pudo abrir la ventana de impresión.",
      download_error: "No se pudo exportar la señal.",
      copied: "Copiado al portapapeles",
      ready: "Fuente lista para usar.",
      synced: "Señales sincronizadas.",
      new_session: "Nueva Sesión Iniciada",
      reset_success: "Fuente restablecida correctamente.",
      active_email_label: "Fuente de señal activa",
      copy_label: "Copiar",
      saved_label: "Guardados",
      refresh_label: "Actualizar",
      save_label: "Guardar",
      new_label: "Nuevo",
      saved_inboxes_label: "Señales guardadas",
      no_results: "No se encontraron resultados",
      auto_refresh_label: "Auto actualizar",
      fetch_emails_error: "Error al obtener señales.",
      fetch_saved_inboxes_error: "Error al obtener señales guardadas.",
      unauthorized_error: "No autorizado.",
      create_inbox_error: "Error al crear señal.",
      auto_refresh_confirm: "Esto actualiza automaticamente el panel y puede generar más solicitudes. ¿Deseas activarlo?",
      generating: "Generando...",
      search_label: "Buscar",
      search_clear_label: "Limpiar",
      close_label: "Cerrar",
      save_dialog_title: "Guardar señal",
      save_dialog_desc: "Vincula esta señal a tu cuenta para conservarla.",
      save_dialog_alias_label: "Alias para identificarla",
      save_dialog_alias_placeholder: "Ej: Estrategia RSI-1H",
      save_dialog_alias_help: "Este nombre te ayudará a identificar la señal en tu cuenta.",
      save_dialog_cancel: "Cancelar",
      save_dialog_confirm: "Guardar",
      save_dialog_saving: "Guardando...",
      save_success_title: "Guardado",
      save_success_desc: "Señal guardada correctamente.",
      error_title: "Error",
      save_error: "Error al guardar.",
      purpose_save_title: "Preferencia guardada",
      purpose_save_desc: "Tu preferencia fue guardada.",
      new_email_title: "Nueva señal",
      refresh_wait_title: "Espera un momento",
      refresh_wait_desc: "Espera {seconds} segundos antes de actualizar.",
      logout_error: "No se pudo cerrar sesion.",
      default_alias: "mi-señal",
      checking_session: "Verificando sesion...",
      redirecting_login: "Redirigiendo al login...",
      time_now: "Ahora",
      time_minutes: "Hace {count} min",
      time_hours: "Hace {count} h",
      time_days: "Hace {count} d",
      purpose_dialog: {
        title: "¿Cuál es tu caso de uso?",
        description: "Selecciona la opción que mejor describe cómo planeas usar la plataforma de señales y datos de mercado de TCorp Business.",
        selection_label: "Selecciona una opción",
        personalization: "Optimización personalizada",
        personalization_desc: "Ajustamos la experiencia a tu flujo de trabajo",
        aliases: "Alias inteligentes",
        aliases_desc: "Generamos direcciones relevantes para tu contexto",
        security: "Seguridad optimizada",
        security_desc: "Protección según tus necesidades específicas",
        additional_details: "Detalles adicionales",
        additional_placeholder: "Cuéntanos más sobre tu caso de uso...",
        continue_btn: "Continuar",
        saving_btn: "Configurando...",
        security_note: "Esta información se almacena de forma segura y se utiliza únicamente para personalizar tu experiencia.",
        purposes: {
          marketing: "Marketing y campañas",
          support: "Soporte al cliente",
          sales: "Ventas y prospectos",
          hr: "Recursos Humanos / Reclutamiento",
          testing: "Testing de productos",
          personal: "Uso personal",
          other: "Otro"
        }
      }
    },
    privacy: {
      title: "Política de Privacidad",
      last_updated: "Última actualización: 16 de Diciembre, 2025",
      intro: "En TCorp Business, tratamos con datos de señales financieros y usuarios; esta política describe cómo protegemos y manejamos esa información.",
      sections: [
        {
          title: "1. Recopilación de Datos Zero-Knowledge",
          content: "No almacenamos registros de actividad, direcciones IP ni metadatos de las señales procesadas. Toda la información sensible se procesa en memoria volátil y se elimina tras la finalización de la sesión o la expiración del TTL (Time To Live)."
        },
        {
          title: "2. Almacenamiento Efímero",
          content: "Las señales y datos relacionados se almacenan en nuestros servidores cifrados únicamente durante la duración de su sesión activa o según la retención configurada. Al cerrar la sesión o exceder el tiempo límite, los datos se sobrescriben criptográficamente antes de ser liberados."
        },
        {
          title: "3. Divulgación a Terceros",
          content: "Nunca vendemos, intercambiamos ni transferimos sus datos a terceros. Debido a nuestra arquitectura de retención cero, no podemos responder a solicitudes de datos históricos, ya que estos no existen."
        },
        {
          title: "4. Cookies y Rastreo",
          content: "Utilizamos únicamente cookies técnicas esenciales para el funcionamiento de la sesión. No utilizamos cookies de rastreo publicitario ni analíticas de terceros."
        }
      ]
    },
    terms: {
      title: "Términos de Servicio",
      last_updated: "Última actualización: 16 de Diciembre, 2025",
      intro: "El uso de la infraestructura de TCorp implica la aceptación de las siguientes condiciones operativas.",
      sections: [
        {
          title: "1. Uso Aceptable",
          content: "Nuestros servicios están diseñados para pruebas de QA, desarrollo y protección de identidad. Está estrictamente prohibido utilizar TCorp para actividades ilegales, spam, phishing o distribución de malware."
        },
        {
          title: "2. Limitación de Responsabilidad",
          content: "TCorp se proporciona 'tal cual'. No garantizamos la disponibilidad ininterrumpida del servicio ni la entrega del 100% de los mensajes entrantes, aunque nuestro SLA objetivo es del 99.9%."
        },
        {
          title: "3. Terminación del Servicio",
          content: "Nos reservamos el derecho de bloquear el acceso a cualquier usuario o dirección IP que abuse de nuestra infraestructura o viole estos términos."
        }
      ]
    },
    about: {
      title: "Acerca de TCorp Business",
      subtitle: "Señales de mercado profesionales para trading en tiempo real.",
      mission: "Proveer señales y herramientas de ejecución con la latencia y precisión que exigen los traders modernos.",
      story: "Formada por ingenieros cuantitativos y traders, TCorp Business combina análisis estadístico y ejecución robusta para entregar señales accionables a equipos y usuarios individuales.",
      values: [
        { title: "Precisión Operativa", desc: "Señales construidas y validadas con datasets reales." },
        { title: "Integración Sencilla", desc: "APIs y WebSockets para integración directa con estrategias algorítmicas." },
        { title: "Soporte Profesional", desc: "Soporte y SLAs para operaciones críticas." }
      ]
    },
    contact: {
      title: "Contacto",
      subtitle: "Estamos aquí para ayudar.",
      form: {
        name: "Nombre",
        email: "Correo Electrónico (Opcional)",
        message: "Mensaje",
        submit: "Enviar Mensaje",
        success: "Mensaje cifrado y enviado correctamente."
      },
      info: {
        title: "Información Directa",
        email: "contact@tcorp.business",
        address: "123 Market St, Finance District, Capital City"
      }
    },
    login: {
      hero_title_1: "Infraestructura de",
      hero_title_2: "Señales de Trading",
      hero_desc: "Accede a tu panel de control para gestionar identidades digitales efimeras con fiabilidad empresarial.",
      hero_features: {
        encryption: "Encriptacion AES-256 de extremo a extremo",
        realtime: "Entrega de mensajes en tiempo real",
        uptime: "99.9% de disponibilidad garantizada"
      },
      title: "Bienvenido de nuevo",
      subtitle: "Ingresa tus credenciales para acceder a tu cuenta",
      email_label: "Correo electronico",
      email_placeholder: "nombre@empresa.com",
      password_label: "Contrasena",
      password_placeholder: "**********",
      security_label: "Verificacion de seguridad",
      submit: "Ingresar",
      submitting: "Verificando...",
      form_heading: "Login",
      two_factor_title: "Codigo del autenticador",
      two_factor_sent: "Abre tu app de autenticacion y genera el codigo.",
      two_factor_placeholder: "Codigo de 6 digitos",
      two_factor_hint: "Usa tu app de autenticacion y escribe el codigo actual.",
      two_factor_submit: "Verificar codigo",
      two_factor_verifying: "Verificando codigo...",
      two_factor_missing: "Ingresa el codigo del autenticador.",
      two_factor_error: "No se pudo verificar el codigo.",
      show_password: "Mostrar contrasena",
      hide_password: "Ocultar contrasena",
      divider: "O",
      no_account: "No tienes una cuenta?",
      create_account: "Crear cuenta",
      forgot_password: "Olvide mi contrasena",
      terms_prefix: "Al iniciar sesion, aceptas nuestros",
      terms: "Terminos de Servicio",
      privacy: "Politica de Privacidad",
      terms_joiner: "y",
      footer: "(c) 2024 TCorp Business Inc. Todos los derechos reservados.",
      toast: {
        verification_required_title: "Verificacion requerida",
        verification_required_desc: "Por favor, completa la verificacion de seguridad",
        verify_account_title: "Verificacion requerida",
        verify_account_desc: "Por favor verifica tu cuenta para continuar",
        welcome_title: "Bienvenido",
        welcome_desc: "Has iniciado sesion correctamente",
        error_title: "Error"
      }
    },
    register: {
      hero_title: "Unete a la nueva era del",
      hero_title_highlight: "señales de trading",
      hero_desc: "Crea tu cuenta y accede a infraestructura de nivel empresarial para recibir y consumir señales de mercado en tiempo real.",
      benefits: [
        "Inboxes ilimitados para pruebas",
        "Dominios dedicados sin listas negras",
        "API RESTful con documentacion completa",
        "Soporte tecnico prioritario",
        "Retencion de datos configurable",
        "Encriptacion de extremo a extremo"
      ],
      footer: "(c) 2024 TCorp Business Inc.",
      title: "Crear cuenta",
      subtitle: "Completa el formulario para comenzar",
      email_label: "Direccion de Email",
      email_placeholder: "tu@email.com",
      password_label: "Contrasena",
      password_placeholder: "Crea una contrasena segura",
      confirm_password_label: "Confirmar Contrasena",
      confirm_password_placeholder: "Confirma tu contrasena",
      promo_label: "Tienes un Codigo Promocional?",
      promo_optional: "(Opcional)",
      promo_placeholder: "",
      security_label: "Verificacion de seguridad",
      form_heading: "Crear cuenta",
      show_password: "Mostrar contrasena",
      hide_password: "Ocultar contrasena",
      forgot_password: "Olvide mi contrasena",
      submit: "Crear cuenta",
      submitting: "Creando cuenta...",
      divider: "O",
      have_account: "Ya tienes una cuenta?",
      login_link: "Iniciar sesion",
      terms_prefix: "Al registrarte, aceptas nuestros",
      terms: "Terminos de Servicio",
      privacy: "Politica de Privacidad",
      terms_joiner: "y",
      toast: {
        verification_required_title: "Verificacion requerida",
        verification_required_desc: "Por favor, completa la verificacion de seguridad",
        error_title: "Error",
        password_mismatch: "Las contrasenas no coinciden",
        account_created_title: "Cuenta creada",
        account_created_desc: "Te enviamos un codigo de verificacion a tu correo"
      }
    },
    verify: {
      hero_title: "Verifica tu",
      hero_title_highlight: "cuenta",
      hero_desc: "Hemos enviado un codigo de verificacion a tu correo electronico. Ingresalo para completar tu registro.",
      hero_card_title: "Revisa tu correo electronico",
      hero_card_desc: "El codigo expira en 15 minutos. Si no lo encuentras, revisa tu carpeta de spam.",
      footer: "(c) 2024 TCorp Business Inc.",
      title: "Verificar cuenta",
      subtitle_with_email: "Ingresa el codigo enviado a",
      subtitle_default: "Ingresa el codigo de verificacion",
      mobile_card_title: "Revisa tu correo",
      mobile_card_desc: "El codigo expira en 15 minutos. Revisa tambien tu carpeta de spam.",
      code_label: "Codigo de verificacion",
      submit: "Verificar cuenta",
      submitting: "Verificando...",
      resend_prompt: "No recibiste el codigo?",
      resend_button: "Reenviar codigo",
      resend_sending: "Enviando...",
      back_login: "Volver al inicio de sesion",
      toast: {
        error_title: "Error",
        missing_code: "Por favor, ingresa el codigo de verificacion",
        verified_title: "Cuenta verificada",
        verified_desc: "Tu cuenta ha sido verificada exitosamente",
        resend_error: "Error al reenviar el codigo",
        resend_title: "Codigo reenviado",
        resend_desc: "Revisa tu bandeja de entrada"
      }
    },

    notfound: {
      dashboard_label: "Ir al panel",
      home_label: "Ir al inicio",
      footer: "(c) 2024 TCorp Business Inc. Todos los derechos reservados.",
      lines: {
        fatal: "Ha ocurrido una excepcion fatal 404 en C0DE:ABAD1DEA en 0xC0DEBA5E.",
        terminated: "La solicitud actual sera terminada.",
        press_return: "* Presiona cualquier tecla para volver a la pagina anterior.",
        press_ctrl: "* Presiona CTRL+ALT+DEL para reiniciar tu computadora. Tu",
        lose_info: "  perderas cualquier informacion sin guardar en todas las aplicaciones.",
        continue: "Presiona cualquier tecla para continuar..."
      }
    },

    common: {
      coming_soon: "Centro informativo",
      coming_soon_desc: "Detalles operativos y enlaces oficiales de la plataforma.",
      back_home: "Volver al Inicio",
      dark_mode_label: "Modo oscuro",
      dark_mode_on: "Activar modo oscuro",
      dark_mode_off: "Desactivar modo oscuro"
    },
    simple_pages: {
      status: {
        title: "Estado del sistema",
        subtitle: "Monitorea la salud de la infraestructura y el estado operativo en tiempo real.",
        highlights_title: "Cobertura",
        highlights: [
          "API y sesiones",
          "WebSocket de inbox",
          "Entrega de mensajes",
          "Panel y anuncios"
        ],
        info_title: "Monitoreo continuo",
        info_desc: "Consulta incidentes, mantenimientos y tiempos de actividad desde el portal oficial.",
        cta_label: "Ver status en tiempo real"
      },
      docs: {
        title: "Documentacion API",
        subtitle: "Endpoints clave para autenticacion, inboxes y administracion de cuenta.",
        highlights_title: "Base y autenticacion",
        highlights: [
          "Base URL: /api",
          "Sesion segura por cookies",
          "Respuestas JSON estandar"
        ],
        endpoints_title: "Endpoints principales",
        endpoints: [
          "/api/auth/*",
          "/api/inbox/*",
          "/api/saved-inboxes",
          "/api/account/*",
          "/api/ads"
        ],
        cta_label: "Contactar soporte"
      },
      security: {
        title: "Seguridad",
        subtitle: "Buenas practicas y controles activos para proteger tu cuenta.",
        highlights_title: "Protecciones",
        highlights: [
          "Cifrado AES-256",
          "Retencion efimera",
          "Bloqueos por IP",
          "2FA y alertas"
        ],
        practices_title: "Recomendaciones",
        practices: [
          "Activa 2FA en tu cuenta",
          "Actualiza tu contrasena regularmente",
          "No compartas accesos"
        ],
        cta_label: "Reportar un issue"
      },
      blog: {
        title: "Blog",
        subtitle: "Notas de version, guias y novedades de la plataforma.",
        highlights_title: "Categorias",
        highlights: [
          "Actualizaciones de producto",
          "Guias de integracion",
          "Cambios operativos"
        ],
        info_title: "Ultimas novedades",
        info_desc: "Publicamos comunicados sobre mejoras, seguridad y mantenimiento.",
        cta_label: "Contactar"
      }
    }
  },
  en: {
    nav: {
      overview: "Overview",
      infrastructure: "Infrastructure",
      pricing: "Pricing",
      dashboard: "Dashboard",
      access_dashboard: "Access Dashboard",
      product: "Product",
      company: "Company",
      legal: "Legal",
      about: "About",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms of Service",
      documentation: "API Documentation",
      status: "Status",
      security: "Security",
      blog: "Blog",
      rights: "All rights reserved."
    },
    home: {
      new_feature: "New: Private FX signal channels",
      title_1: "FX Trading",
      title_2: "Signals.",
      subtitle: "Receive forex market movement signals in real time with institutional-grade precision. RESTful API, alerts, and configurable history.",
      start_btn: "Open Signals Panel",
      docs_btn: "API Documentation",
      encryption: "Institutional-grade protection",
      uptime: "24/7 global FX coverage",
      retention: "Configurable signal history",
      control_title: "Full control over your FX trading signals.",
      control_desc: "TCorp Business delivers reliable low-latency FX signals for professional traders and quantitative teams.",
      features: [
        "FX signals based on technical and statistical analysis.",
        "Real-time alerts with low latency.",
        "API integration for algorithmic trading and backtesting."
      ],
      cards: {
        privacy: { title: "Accuracy", desc: "Models tuned to reduce false positives in signals." },
        speed: { title: "Low Latency", desc: "Signal delivery in <200ms via WebSockets." },
        scale: { title: "Scalable", desc: "From individual traders to institutional-grade team infrastructure." }
      },
      ads: {
        kicker: "Advertising",
        title: "Sponsored slots",
        note: "Partner inventory available",
        wide_label: "Banner 970x90",
        square_label: "Rectangle 300x250",
        meta: "Ad placeholder"
      },
      pricing_title: "FX Signals Plans",
      pricing_subtitle: "Clear pricing for forex traders and quantitative teams.",
      free_tier: {
        title: "Developer",
        desc: "Ideal for testing and individual traders who need basic FX signals.",
        features: ["Real-time FX signals (basic)", "Limited API access", "1-hour history"],
        btn: "Start"
      },
      pro_tier: {
        title: "Enterprise",
        desc: "Complete solution for teams that need dedicated FX signals and SLA.",
        features: ["Private FX signal channels", "Configurable limits and retention", "SLA support"],
        btn: "Upgrade to Enterprise",
        note: "Annual billing available (contact for pricing)"
      }
    },
    inbox: {
      title: "Signals Panel",
      subtitle: "Manage and consume market signals in real time.",
      system_online: "SYSTEM ONLINE",
      active_identity: "Active Source",
      inbox_hint: "Your signals appear in the left column. Select one to view details.",
      search_placeholder: "type to search assets or use @ for filters",
      from_label: "Source",
      sync: "Sync",
      reset: "Reset",
      new_info: "The New button does not delete the current signal, it only generates a new one.",
      inbox_header: "Signals",
      waiting: "Waiting for transmissions...",
      select_msg: "Select a signal to view details",
      public_domain: "Public Source Detected.",
      upgrade_msg: "Upgrade to use private signal channels.",
      upgrade_btn: "Upgrade to Enterprise ($5/mo)",
      to: "To",
      received_label: "Received",
      message_id_label: "ID",
      preview_label: "Preview",
      format_label: "Format",
      size_label: "Size",
      format_html: "Chart",
      format_text: "Text",
      print_label: "Print",
      download_label: "Export",
      print_error: "Unable to open the print window.",
      download_error: "Unable to export the signal.",
      copied: "Copied to clipboard",
      ready: "Source ready to use.",
      synced: "Signals synced.",
      new_session: "New Session Started",
      reset_success: "Source reset successfully.",
      active_email_label: "Active signal source",
      copy_label: "Copy",
      saved_label: "Saved",
      refresh_label: "Refresh",
      save_label: "Save",
      new_label: "New",
      saved_inboxes_label: "Saved signals",
      no_results: "No results found",
      auto_refresh_label: "Auto refresh",
      fetch_emails_error: "Failed to fetch signals.",
      fetch_saved_inboxes_error: "Failed to fetch saved signals.",
      unauthorized_error: "Unauthorized.",
      create_inbox_error: "Failed to create signal.",
      auto_refresh_confirm: "This will auto refresh the panel and may generate more requests. Do you want to enable it?",
      generating: "Generating...",
      search_label: "Search",
      search_clear_label: "Clear",
      close_label: "Close",
      save_dialog_title: "Save signal",
      save_dialog_desc: "Link this signal to your account so it does not expire.",
      save_dialog_alias_label: "Alias to identify it",
      save_dialog_alias_placeholder: "Ex: RSI-1H Signal",
      save_dialog_alias_help: "This name helps you identify the signal in your account.",
      save_dialog_cancel: "Cancel",
      save_dialog_confirm: "Save",
      save_dialog_saving: "Saving...",
      save_success_title: "Saved",
      save_success_desc: "Signal saved successfully.",
      error_title: "Error",
      save_error: "Failed to save.",
      purpose_save_title: "Preference saved",
      purpose_save_desc: "Your preference was saved.",
      new_email_title: "New signal",
      refresh_wait_title: "Please wait",
      refresh_wait_desc: "Wait {seconds} seconds before refreshing.",
      logout_error: "Failed to sign out.",
      default_alias: "my-signal",
      checking_session: "Checking session...",
      redirecting_login: "Redirecting to login...",
      time_now: "Just now",
      time_minutes: "{count} min ago",
      time_hours: "{count} h ago",
      time_days: "{count} d ago",
      purpose_dialog: {
        title: "What is your use case?",
        description: "Select the option that best describes how you plan to use TCorp's temporary email infrastructure.",
        selection_label: "Select an option",
        personalization: "Personalized optimization",
        personalization_desc: "We customize the experience to your workflow",
        aliases: "Smart aliases",
        aliases_desc: "We generate addresses relevant to your context",
        security: "Optimized security",
        security_desc: "Protection tailored to your specific needs",
        additional_details: "Additional details",
        additional_placeholder: "Tell us more about your use case...",
        continue_btn: "Continue",
        saving_btn: "Configuring...",
        security_note: "This information is stored securely and is used only to personalize your experience.",
        purposes: {
          marketing: "Marketing and campaigns",
          support: "Customer support",
          sales: "Sales and prospects",
          hr: "Human Resources / Recruitment",
          testing: "Product testing",
          personal: "Personal use",
          other: "Other"
        }
      }
    },
    privacy: {
      title: "Privacy Policy",
      last_updated: "Last updated: December 16, 2025",
      intro: "At TCorp, your privacy is not an optional feature; it is the foundation of our architecture. This policy outlines how we handle (and destroy) information.",
      sections: [
        {
          title: "1. Zero-Knowledge Data Collection",
          content: "We do not store activity logs, IP addresses, or metadata of processed signals. All sensitive information is handled in volatile memory and deleted upon session termination or TTL (Time To Live) expiration."
        },
        {
          title: "2. Ephemeral Storage",
          content: "Signals and related telemetry are stored on our encrypted servers only for the duration of your active session or configured retention. Upon logout or expiry, data is cryptographically overwritten before being released."
        },
        {
          title: "3. Third-Party Disclosure",
          content: "We never sell, trade, or transfer your data to third parties. Due to our zero-retention architecture, we cannot respond to historical data requests as they do not exist."
        },
        {
          title: "4. Cookies and Tracking",
          content: "We use only essential technical cookies for session operation. We do not use advertising tracking cookies or third-party analytics."
        }
      ]
    },
    terms: {
      title: "Terms of Service",
      last_updated: "Last updated: December 16, 2025",
      intro: "Use of TCorp infrastructure implies acceptance of the following operational conditions.",
      sections: [
        {
          title: "1. Acceptable Use",
          content: "Our services are designed for QA testing, development, and identity protection. Strictly prohibited is using TCorp for illegal activities, spam, phishing, or malware distribution."
        },
        {
          title: "2. Limitation of Liability",
          content: "TCorp is provided 'as is'. We do not guarantee uninterrupted service availability or 100% delivery of incoming messages, although our target SLA is 99.9%."
        },
        {
          title: "3. Service Termination",
          content: "We reserve the right to block access to any user or IP address that abuses our infrastructure or violates these terms."
        }
      ]
    },
    about: {
      title: "About TCorp",
      subtitle: "Building the privacy standard for the digital age.",
      mission: "Our mission is to provide ephemeral communications infrastructure that fundamentally respects the right to privacy and digital anonymity.",
      story: "Founded by security engineers and privacy advocates, TCorp was born from the need for reliable testing tools that didn't compromise user data. Today, we process millions of emails daily for developers, testers, and security-conscious users worldwide.",
      values: [
        { title: "Privacy by Design", desc: "Not an add-on, it's the core." },
        { title: "Radical Transparency", desc: "Open source where it matters, clear policies where not." },
        { title: "Robust Engineering", desc: "Systems built to withstand attacks and failures." }
      ]
    },
    contact: {
      title: "Contact",
      subtitle: "We are here to help.",
      form: {
        name: "Name",
        email: "Email (Optional)",
        message: "Message",
        submit: "Send Message",
        success: "Message encrypted and sent successfully."
      },
      info: {
        title: "Direct Info",
        email: "secure@tcorp.dev",
        address: "123 Privacy Blvd, Sector 7G, Digital City"
      }
    },
    login: {
      hero_title_1: "Trading Signals",
      hero_title_2: "Infrastructure",
      hero_desc: "Access your control panel to manage ephemeral digital identities with enterprise reliability.",
      hero_features: {
        encryption: "End-to-end AES-256 encryption",
        realtime: "Real-time message delivery",
        uptime: "99.9% guaranteed availability"
      },
      title: "Welcome back",
      subtitle: "Enter your credentials to access your account",
      email_label: "Email",
      email_placeholder: "name@company.com",
      password_label: "Password",
      password_placeholder: "**********",
      security_label: "Security verification",
      submit: "Sign in",
      submitting: "Verifying...",
      form_heading: "Login",
      two_factor_title: "Authenticator code",
      two_factor_sent: "Open your authenticator app and generate the code.",
      two_factor_placeholder: "6-digit code",
      two_factor_hint: "Use your authenticator app and enter the current code.",
      two_factor_submit: "Verify code",
      two_factor_verifying: "Verifying code...",
      two_factor_missing: "Enter the authenticator code.",
      two_factor_error: "Unable to verify the code.",
      show_password: "Show password",
      hide_password: "Hide password",
      divider: "OR",
      no_account: "Don't have an account?",
      create_account: "Create account",
      forgot_password: "Forgot Password",
      terms_prefix: "By signing in, you agree to our",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      terms_joiner: "and",
      footer: "(c) 2024 TCorp Systems Inc. All rights reserved.",
      toast: {
        verification_required_title: "Verification required",
        verification_required_desc: "Please complete the security verification",
        verify_account_title: "Verification required",
        verify_account_desc: "Please verify your account to continue",
        welcome_title: "Welcome",
        welcome_desc: "You have signed in successfully",
        error_title: "Error"
      }
    },
    register: {
      hero_title: "Join the new era of",
      hero_title_highlight: "trading signals",
      hero_desc: "Create your account and access enterprise-grade infrastructure to manage digital identities.",
      benefits: [
        "Unlimited inboxes for testing",
        "Dedicated domains without blacklists",
        "RESTful API with full documentation",
        "Priority technical support",
        "Configurable data retention",
        "End-to-end encryption"
      ],
      footer: "(c) 2024 TCorp Systems Inc.",
      title: "Create account",
      subtitle: "Complete the form to get started",
      email_label: "Email address",
      email_placeholder: "you@email.com",
      password_label: "Password",
      password_placeholder: "Create a strong password",
      confirm_password_label: "Confirm password",
      confirm_password_placeholder: "Confirm your password",
      promo_label: "Do you have a promo code?",
      promo_optional: "(Optional)",
      promo_placeholder: "",
      security_label: "Security verification",
      form_heading: "Create account",
      show_password: "Show password",
      hide_password: "Hide password",
      forgot_password: "Forgot Password",
      submit: "Create account",
      submitting: "Creating account...",
      divider: "OR",
      have_account: "Already have an account?",
      login_link: "Sign in",
      terms_prefix: "By registering, you agree to our",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      terms_joiner: "and",
      toast: {
        verification_required_title: "Verification required",
        verification_required_desc: "Please complete the security verification",
        error_title: "Error",
        password_mismatch: "Passwords do not match",
        account_created_title: "Account created",
        account_created_desc: "We sent a verification code to your email"
      }
    },
    verify: {
      hero_title: "Verify your",
      hero_title_highlight: "account",
      hero_desc: "We sent a verification code to your email. Enter it to complete your registration.",
      hero_card_title: "Check your email",
      hero_card_desc: "The code expires in 15 minutes. If you can't find it, check your spam folder.",
      footer: "(c) 2024 TCorp Systems Inc.",
      title: "Verify account",
      subtitle_with_email: "Enter the code sent to",
      subtitle_default: "Enter the verification code",
      mobile_card_title: "Check your email",
      mobile_card_desc: "The code expires in 15 minutes. Also check your spam folder.",
      code_label: "Verification code",
      submit: "Verify account",
      submitting: "Verifying...",
      resend_prompt: "Didn't receive the code?",
      resend_button: "Resend code",
      resend_sending: "Sending...",
      back_login: "Back to sign in",
      toast: {
        error_title: "Error",
        missing_code: "Please enter the verification code",
        verified_title: "Account verified",
        verified_desc: "Your account has been verified successfully",
        resend_error: "Error resending the code",
        resend_title: "Code resent",
        resend_desc: "Check your inbox"
      }
    },

    notfound: {
      dashboard_label: "Go to dashboard",
      home_label: "Go to home",
      footer: "(c) 2024 TCorp Systems Inc. All rights reserved.",
      lines: {
        fatal: "A fatal exception 404 has occurred at C0DE:ABAD1DEA in 0xC0DEBA5E.",
        terminated: "The current request will be terminated.",
        press_return: "* Press any key to return to the previous page.",
        press_ctrl: "* Press CTRL+ALT+DEL to restart your computer. You will",
        lose_info: "  lose any unsaved information in all applications.",
        continue: "Press any key to continue..."
      }
    },

    common: {
      coming_soon: "Info center",
      coming_soon_desc: "Operational details and official platform links.",
      back_home: "Back to Home",
      dark_mode_label: "Dark mode",
      dark_mode_on: "Enable dark mode",
      dark_mode_off: "Disable dark mode"
    },
    simple_pages: {
      status: {
        title: "System status",
        subtitle: "Monitor platform health and real-time operational status.",
        highlights_title: "Coverage",
        highlights: [
          "API and sessions",
          "Inbox WebSocket",
          "Message delivery",
          "Dashboard and ads"
        ],
        info_title: "Continuous monitoring",
        info_desc: "Review incidents, maintenance windows, and uptime on the official portal.",
        cta_label: "View live status"
      },
      docs: {
        title: "API documentation",
        subtitle: "Key endpoints for auth, inboxes, and account management.",
        highlights_title: "Base and auth",
        highlights: [
          "Base URL: /api",
          "Secure cookie session",
          "Standard JSON responses"
        ],
        endpoints_title: "Main endpoints",
        endpoints: [
          "/api/auth/*",
          "/api/inbox/*",
          "/api/saved-inboxes",
          "/api/account/*",
          "/api/ads"
        ],
        cta_label: "Contact support"
      },
      security: {
        title: "Security",
        subtitle: "Best practices and active controls to protect your account.",
        highlights_title: "Protections",
        highlights: [
          "AES-256 encryption",
          "Ephemeral retention",
          "IP blocking",
          "2FA and alerts"
        ],
        practices_title: "Recommendations",
        practices: [
          "Enable 2FA on your account",
          "Rotate your password regularly",
          "Do not share access"
        ],
        cta_label: "Report an issue"
      },
      blog: {
        title: "Blog",
        subtitle: "Release notes, guides, and platform updates.",
        highlights_title: "Categories",
        highlights: [
          "Product updates",
          "Integration guides",
          "Operational changes"
        ],
        info_title: "Latest updates",
        info_desc: "We publish announcements about improvements, security, and maintenance.",
        cta_label: "Get in touch"
      }
    }
  }
};

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.es;
} | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
