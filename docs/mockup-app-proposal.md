# Aplicación de Gestión y Generación de Mockups para Sublimación

## Finalidad
Optimizar la visualización previa de productos sublimados mediante la generación de mockups en tiempo real, ayudando a clientes y diseñadores a tomar decisiones informadas, reducir errores y mejorar la experiencia de compra.

## Funcionalidades principales
- **Generador de mockups:** carga diseños (JPG, PNG, PDF) y los aplica sobre plantillas de tazas cilíndricas y cónicas, camisetas (frontal y dorsal), termos y vasos, cojines, cuadros, lonas y papelería. Incluye escala, rotación, perspectiva y opacidad.
- **Biblioteca de plantillas:** repositorio categorizado de mockups (mínimo 300 dpi) con metadatos de dimensiones físicas y área imprimible.
- **Personalización avanzada:** ajuste de color CMYK, simulación de brillo y sombreado, control de textura y relieve, visualización 3D rotativa.
- **Exportación de proyectos:** PNG con fondo transparente, JPG de alta resolución, PDF listo para impresión y mockup animado (MP4 o WebM).
- **Panel administrativo:** gestión de usuarios y roles, catálogo de productos reales por mockup y registro de pedidos con cotizaciones automáticas.

## Arquitectura técnica propuesta
- **Frontend:** React + Tailwind CSS; Flutter para versión móvil.
- **Render gráfico:** Three.js o Babylon.js para mockups 3D.
- **Backend:** Node.js + Express.
- **Base de datos:** MongoDB para medios y productos; Firebase para sesiones.
- **Almacenamiento:** Cloud Storage (AWS S3 o Firebase Storage) para plantillas.
- **Integraciones IA opcionales:** remoción de fondo y adaptación automática al área imprimible (Stable Diffusion + ControlNet).

## Flujo del usuario
Ingreso → Selección de producto → Carga de diseño → Edición → Vista previa → Exportación → Registro en pedido.

## Modelo de negocio
- **Plan gratuito:** plantillas básicas con marca de agua.
- **Plan profesional:** exportación sin marca de agua y mockups 3D.
- **Plan empresarial:** catálogo ilimitado, API para tiendas y soporte técnico.
