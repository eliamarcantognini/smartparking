import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {UserInformationService} from "../services/userinformationservice";
import {Deposit} from "../models/deposit";
import {CustomerService} from "../services/backendcalls/customerservice";
import {Authorizationservice} from "../services/backendcalls/authorizationservice";
import {UserResponse} from "../models/userresponse";
import {AppConstants} from "../utils/constants";
import {DepositService} from "../services/backendcalls/depositservice";
import {CanvasJS} from "@canvasjs/angular-charts";
import {TrashTypeManager} from "../models/trashtype";

interface DataChart {
  type: string,
  name: string,
  legendText: string,
  showInLegend: boolean,
  dataPoints: { label: string, y: number }[]
}

interface DepositByTypeMonthly {
  garbageType: string,
  months: { monthName: string, quantity: number, price: number }[]
}

@Component({
  selector: 'app-monthlycost',
  templateUrl: './monthlycost.component.html',
  styleUrls: ['./monthlycost.component.scss']
})

export class MonthlycostComponent implements OnInit {

  private userID!: string
  public user!: UserResponse
  public userDeposits!: Deposit[]
  public depositsDataCharts!: DataChart[]
  public userDepositsGroupedByTypeAndMonth!: DepositByTypeMonthly[]
  public depositsFromMonth = 1
  public exclLastNMonths = 0
  public chart: any
  private monthDeposits!: Deposit[]
  private viewPrice: boolean = true
  buttonTextViewChart: string

  constructor(
    private userInfoService: UserInformationService,
    private customerService: CustomerService,
    private authorizationService: Authorizationservice,
    private depositService: DepositService,
  ) {
    console.log('Monthlycost constuctor');
    console.log(this.userInfoService);
    this.buttonTextViewChart = this.viewPrice ? "Cambia in grafico sulla quantità" : "Cambia in grafico sui prezzi"
  }

  @ViewChild('monthlyCostContainer') monthlyCostContainer!: ElementRef;

  ngOnInit(): void {
    console.log('MonthlyCost OnInit');
    this.authorizationService.checkAuthDataORRedirect()
    // @ts-ignore
    this.userID = localStorage.getItem(AppConstants.lSUserID)
    this.setUser()
    this.setDeposits()
  }


  private getSlicedDeposits(deposits: Deposit[], fromMonth?: number, exlNLastMonths?: number) {
    let date = new Date(), y = date.getFullYear(), m = date.getMonth()
    let firstDay = new Date(y, m, 1)
    let lastDay = new Date(y, m + 1, 1)

    firstDay.setMonth(firstDay.getMonth() - (fromMonth || 0))
    lastDay.setMonth(lastDay.getMonth() - (exlNLastMonths || 0))
    return deposits
      .filter(deposit => deposit.date >= firstDay)
      .filter(deposit => deposit.date < lastDay)
  }


  getDepositCanvasOptions(dataChart: DataChart[]) {
    return {
      backgroundColor: "rgba(255,150,150,0)",
      animationEnabled: true,
      title: {
        text: "Depositi"
      },
      axisX: {
        labelAngle: -90
      },
      axisY: {
        gridThickness: 1,
        gridColor: "rgba(200,200,200,0.6)",
        title: "EUR €"
      },
      toolTip: {
        shared: true
      },
      legend: {
        cursor: "pointer",
        itemclick: function (e: any) {
          if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
            e.dataSeries.visible = false;
          } else {
            e.dataSeries.visible = true;
          }
          e.chart.render();
        }
      },
      data: dataChart
    }
  }

  private setUser() {
    // @ts-ignore
    this.customerService.getCustomerByID(localStorage.getItem(AppConstants.lSUserID)).subscribe({
      next: (res) => this.user = this.userInfoService.user = res,
      error: err => console.log(err)
    })
  }

  getMonthTag(date: Date) {
    let dateFormat = date.toLocaleString('default', {month: 'long'})
      + (date.getFullYear() === new Date().getFullYear() ? '' : ' - ' + date.getFullYear())
    return dateFormat.charAt(0).toUpperCase() + dateFormat.slice(1)
  }


  getMonthlyDepositsByType(deposits: Deposit[], fromMonth: number, exlNLastMonths: number) {
    let depositsLimited = this.getSlicedDeposits(deposits, fromMonth, exlNLastMonths)

    let types = depositsLimited
      .map(deposit => deposit.type)
      .filter((depositType, index, self) => index === self.indexOf(depositType))

    let months: Date[] = []
    for (let i = 0; i <= fromMonth - exlNLastMonths; i++) {
      let x = new Date()
      x.setMonth(x.getMonth() - fromMonth + i)
      months.push(x)
    }

    let depositsByTypeMonthly: DepositByTypeMonthly[] = []
    for (let type of types) {
      let depositOfType: DepositByTypeMonthly = {
        garbageType: type,
        months: []
      }
      for (let month of months) {
        let quantityMonthResult: number = 0
        let priceMonthResult: number = 0
        depositsLimited
          .filter(deposit => deposit.type === type)
          .filter(deposit => deposit.date.getMonth() === month.getMonth())
          // .map(deposit => deposit.quantity)
          .forEach(dep => {
            quantityMonthResult = quantityMonthResult + dep.quantity
            priceMonthResult = priceMonthResult + dep.price
          })
        depositOfType.months.push({
          monthName: this.getMonthTag(month),
          quantity: quantityMonthResult,
          price: priceMonthResult
        })
      }
      depositsByTypeMonthly.push(depositOfType)
    }
    return depositsByTypeMonthly
  }

  getDataChart(depositTypelyMonthly: DepositByTypeMonthly[], viewPrice: boolean) {
    let trashTypeManager = new TrashTypeManager()
    let result: DataChart[] = []
    let firstType = true
    for (let type of depositTypelyMonthly) {
      let depositOfType: DataChart = {
        type: 'column',
        // @ts-ignore
        name: trashTypeManager.getItalianName(type.garbageType),
        // @ts-ignore
        legendText: trashTypeManager.getItalianName(type.garbageType),
        showInLegend: true,
        // @ts-ignore
        indexLabelFontSize: 12,
        indexLabelFontFamily: "Lucida Console",
        // @ts-ignore
        showInLegend: true,
        // @ts-ignore
        color: trashTypeManager.getColorForTrashType(type.garbageType),
        dataPoints: []
      }
      for (let month of type.months) {
        let monthName = firstType ? month.monthName + "<br>" : ""
        depositOfType.dataPoints.push({
          label: month.monthName,
          y: viewPrice ? Math.ceil(month.price * 100) / 100 : Math.ceil(month.quantity * 100) / 100,
          // @ts-ignore
          toolTipContent: monthName + "{name}: <strong>" + month.quantity + "</strong>Kg <strong>" + month.price.toFixed(2) + "</strong>€",
          indexLabel: (month.quantity > 0 && this.monthlyCostContainer.nativeElement.offsetWidth > 800
            // @ts-ignore
            ? trashTypeManager.getItalianName(type.garbageType).substring(0, 5) : "")
        })
      }
      firstType = false
      result.push(depositOfType)
    }
    return result

  }

  emptyDataChart(fromMonth: number, exlNLastMonths: number) {
    let dataC: DataChart[] = []
    let dep: DataChart = {
      type: 'column',
      name: '',
      legendText: '',
      // @ts-ignore
      indexLabelFontSize: 12,
      indexLabelFontFamily: "Lucida Console",
      dataPoints: []
    }
    dataC.push(dep)
    for (let i = fromMonth; i - exlNLastMonths >= 0; i--) {
      let month = new Date()
      month.setMonth(month.getMonth() - i)
      console.log("month", month)
      dep.dataPoints.push({
        label: this.getMonthTag(month),
        y: 0
      })
    }
    return dataC
  }


  updateDataChart() {
    this.userDepositsGroupedByTypeAndMonth = this.getMonthlyDepositsByType(this.userDeposits, this.depositsFromMonth, this.exclLastNMonths)
    console.log("this.userDepositsGroupedByTypeAndMonth", this.userDepositsGroupedByTypeAndMonth)
    this.depositsDataCharts = this.userDepositsGroupedByTypeAndMonth.length > 0 ?
      this.getDataChart(this.userDepositsGroupedByTypeAndMonth, this.viewPrice)
      : this.emptyDataChart(this.depositsFromMonth, this.exclLastNMonths)
    console.log("this.depositsDataCharts", this.depositsDataCharts)
    this.chart.options.axisY.title = this.viewPrice ? "EUR €" : "Kg"
    this.chart.options.data = this.depositsDataCharts
    this.chart.render()
  }

  previousMonth() {
    console.log('previousMonth');
    this.depositsFromMonth += 1
    this.exclLastNMonths += 1
    this.updateDataChart()
  }

  nextMonth() {
    console.log('nextMonth');
    this.depositsFromMonth -= 1
    this.exclLastNMonths -= 1
    this.updateDataChart()
  }

  private setDeposits() {

    // @ts-ignore
    this.depositService.getDepositsFromUser(localStorage.getItem(AppConstants.lSUserID)).subscribe({
      next: res => {
        let deposits = res.map(deposit => {
          deposit.date = new Date(deposit.date);
          return deposit
        })
        this.userDeposits = this.userInfoService.userDeposits = deposits
        this.monthDeposits = this.userDeposits.filter(deposit => deposit.date.getMonth() > (new Date()).getMonth() - 1)
        this.chart = new CanvasJS.Chart('chartContainer', this.getDepositCanvasOptions([]))
        this.updateDataChart()
        // this.chart.render()
      },
      error: err => console.log(err)
    })
  }

  public print() {
    console.log(this.userDepositsGroupedByTypeAndMonth);
    console.log('this.userID=', this.userID)
    console.log('this.user=', this.user)
    console.log('this.userDeposits=', this.userDeposits)
    console.log('this.monthDeposits=', this.monthDeposits)
    console.log('this.userDepositsGroupedByTypeAndMonth = ', this.userDepositsGroupedByTypeAndMonth)
  }

  changeViewPriceQuantity() {
    this.viewPrice = !this.viewPrice
    this.buttonTextViewChart = this.viewPrice ? "Cambia in grafico sulla quantità" : "Cambia in grafico sui prezzi"
    this.updateDataChart()
  }
}
