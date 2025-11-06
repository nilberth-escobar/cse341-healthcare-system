package com.example.severancecalculator

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SeveranceCalculatorApp()
        }
    }
}

@Composable
fun SeveranceCalculatorApp() {
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            CalculatorForm()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalculatorForm() {
    var salary by remember { mutableStateOf("") }
    var daysWorked by remember { mutableStateOf("260") }
    var yearsService by remember { mutableStateOf("1") }
    var bonusDays by remember { mutableStateOf("15") }
    var vacationDays by remember { mutableStateOf("12") }
    var vacationBonus by remember { mutableStateOf("25") }

    var finiquitoResult by remember { mutableStateOf<Double?>(null) }
    var liquidacionResult by remember { mutableStateOf<Double?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "Calculadora de finiquito y liquidación", style = MaterialTheme.typography.titleLarge)

        NumericField(label = R.string.salary_label, value = salary, onValueChange = { salary = it })
        NumericField(label = R.string.days_worked_label, value = daysWorked, onValueChange = { daysWorked = it })
        NumericField(label = R.string.years_service_label, value = yearsService, onValueChange = { yearsService = it })
        NumericField(label = R.string.bonus_days_label, value = bonusDays, onValueChange = { bonusDays = it })
        NumericField(label = R.string.vacation_days_label, value = vacationDays, onValueChange = { vacationDays = it })
        NumericField(label = R.string.vacation_bonus_label, value = vacationBonus, onValueChange = { vacationBonus = it })

        Button(onClick = {
            val calculator = SeveranceCalculator(
                monthlySalary = salary.toDoubleOrNull() ?: 0.0,
                daysWorked = daysWorked.toDoubleOrNull() ?: 0.0,
                yearsOfService = yearsService.toDoubleOrNull() ?: 0.0,
                annualBonusDays = bonusDays.toDoubleOrNull() ?: 0.0,
                annualVacationDays = vacationDays.toDoubleOrNull() ?: 0.0,
                vacationBonusPercent = vacationBonus.toDoubleOrNull() ?: 0.0
            )
            finiquitoResult = calculator.calculateFiniquito()
            liquidacionResult = calculator.calculateLiquidacion()
        }) {
            Text(text = stringResource(id = R.string.calculate_button))
        }

        finiquitoResult?.let {
            Text(text = stringResource(id = R.string.finiquito_result) + ": $" + String.format("%.2f", it))
        }

        liquidacionResult?.let {
            Text(text = stringResource(id = R.string.liquidacion_result) + ": $" + String.format("%.2f", it))
        }
    }
}

@Composable
fun NumericField(label: Int, value: String, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(text = stringResource(id = label)) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = Modifier.fillMaxWidth()
    )
}

@Stable
class SeveranceCalculator(
    private val monthlySalary: Double,
    private val daysWorked: Double,
    private val yearsOfService: Double,
    private val annualBonusDays: Double,
    private val annualVacationDays: Double,
    private val vacationBonusPercent: Double
) {
    private val dailySalary: Double get() = monthlySalary / 30.0

    fun calculateFiniquito(): Double {
        val proportionalBonus = dailySalary * (annualBonusDays / 365.0) * daysWorked
        val vacationPay = dailySalary * (annualVacationDays / 365.0) * daysWorked
        val vacationBonus = vacationPay * (vacationBonusPercent / 100.0)
        val pendingSalary = dailySalary * daysWorked
        return (pendingSalary + proportionalBonus + vacationPay + vacationBonus).coerceAtLeast(0.0)
    }

    fun calculateLiquidacion(): Double {
        val finiquito = calculateFiniquito()
        val constitutionalCompensation = dailySalary * 90.0
        val seniorityPremium = dailySalary * 20.0 * yearsOfService
        return (finiquito + constitutionalCompensation + seniorityPremium).coerceAtLeast(0.0)
    }
}
