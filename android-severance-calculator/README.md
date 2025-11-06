# Calculadora de Finiquito y Liquidación

Aplicación Android escrita en Kotlin con Jetpack Compose que estima el finiquito y la liquidación de un empleado en México.

## Características
- Captura de salario mensual, días trabajados, años de servicio, días de aguinaldo, días de vacaciones y prima vacacional.
- Cálculo instantáneo del finiquito con salario pendiente, proporción de aguinaldo y vacaciones.
- Cálculo de la liquidación agregando compensación constitucional y prima de antigüedad.

## Fórmulas utilizadas
- **Salario diario:** `salario mensual / 30`
- **Proporción de aguinaldo:** `salario diario * (días de aguinaldo / 365) * días trabajados`
- **Vacaciones proporcionales:** `salario diario * (días de vacaciones / 365) * días trabajados`
- **Prima vacacional:** `vacaciones proporcionales * (prima vacacional / 100)`
- **Finiquito:** suma de salario pendiente + proporción de aguinaldo + vacaciones proporcionales + prima vacacional.
- **Liquidación:** `finiquito + salario diario * 90 + salario diario * 20 * años de servicio`

> ⚠️ Los cálculos son aproximados y pueden variar según la legislación vigente o condiciones contractuales específicas.

## Requisitos
- Android Studio Iguana o superior.
- Android Gradle Plugin 8.2.2.
- JDK 17.

## Ejecución
1. Abrir Android Studio y seleccionar **File > Open**.
2. Elegir la carpeta `android-severance-calculator`.
3. Esperar a que Gradle sincronice el proyecto.
4. Ejecutar la aplicación en un dispositivo o emulador con Android 7.0 (API 24) o superior.

## Generar APK
1. En Android Studio, ir a **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Una vez finalizado, Android Studio mostrará la ubicación del APK generado.
