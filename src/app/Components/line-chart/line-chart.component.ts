import { Component, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { Particulars } from 'src/app/Models/BrandStock';
import { ApiService } from 'src/app/Service/api-service';

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css'],
})
export class LineChartComponent {
  @ViewChild('chart', { static: false }) private chartContainer!: ElementRef;

  private margin = { top: 30, right: 30, bottom: 50, left: 50 };
  private width = 600 - this.margin.left - this.margin.right;
  private height = 400 - this.margin.top - this.margin.bottom;
  private svg!: d3.Selection<SVGGElement, unknown, null, undefined>;

  private data: any[] = [];
  Particulars: Particulars[];
  selectedCategory: string | undefined = '';

  labels: { crossLabel: string; dotLabel: string };
  chartLoaded: boolean = false;
  loading: boolean = true;

  constructor(private apiService: ApiService) {
    this.loading = true;
    this.Particulars = [
      { Id: 1, name: 'MOQ' },
      { Id: 2, name: 'Discount Percent' },
    ];
    this.selectedCategory = this.Particulars.find((x) => (x.Id = 1))?.name;
    this.labels = { crossLabel: '', dotLabel: '' };
    this.apiService.getData().subscribe((response: any) => {
      this.data = response.products;
      // this.loading = false; // Hide loader after data is loaded
      this.createChartMoqWise();
      // this.createChartMoqWise();

      console.log(this.data, 'data');
      // this.data = this.datas;
      // this.createCharts();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.chartContainer) {
        this.loading = false;
        this.createChartMoqWise(); // Call your chart initialization here
      }
    }, 1000); // Delay to allow DOM rendering
  }

  applyFilter(event: Event) {
    const selectedFilter = (event.target as HTMLSelectElement).value;

    this.selectedCategory = selectedFilter;
  }
  applyFilters() {
    if (this.selectedCategory === 'MOQ') {
      this.createChartMoqWise();
    } else if (this.selectedCategory === 'Discount Percent') {
      this.createChartDiscountWise();
    }
  }

  private createChartMoqWise(): void {
    //assigning labels
    this.labels = {
      crossLabel: 'MOQ per Product',
      dotLabel: 'Average Rating at MOQ',
    };

    this.loading = false; // Hide loader after data is loaded

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove(); // Clear existing chart

    this.svg = d3
      .select(element)
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    // **STEP 1: Compute the average rating for each MOQ**
    const groupedData = d3.group(this.data, (d) => d.minimumOrderQuantity);
    let averagedData = Array.from(
      groupedData,
      ([minimumOrderQuantity, products]) => ({
        minimumOrderQuantity,
        rating: d3.mean(products, (d) => d.rating)!, // Calculate average rating
      })
    );
    // averagedData.sort((a, b) => a.rating - b.rating);
    averagedData.sort(
      (a, b) => a.minimumOrderQuantity - b.minimumOrderQuantity
    );
    console.log(averagedData, 'avg data');

    // averagedData = averagedData.slice(0, 5);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(this.data, (d) => d.minimumOrderQuantity)!])
      .range([0, this.width]);

    const yScale = d3.scaleLinear().domain([0, 5]).range([this.height, 0]);

    const line = d3
      .line<{ minimumOrderQuantity: number; rating: number }>()
      .x((d) => xScale(d.minimumOrderQuantity))
      .y((d) => yScale(d.rating))
      .curve(d3.curveMonotoneX);

    // X-Axis
    this.svg
      .append('g')
      .attr('transform', `translate(0, ${this.height})`)
      .call(d3.axisBottom(xScale));

    //x-axis label
    this.svg
      .append('text')
      .attr('x', this.width / 2) // Center horizontally
      .attr('y', this.height + this.margin.bottom - 10) // Position below the X-axis
      .attr('text-anchor', 'middle') // Align text
      .style('font-size', '14px') // Adjust font size
      .style('fill', 'black') // Text color
      .text('MOQ(Unit)'); // Your X-axis label

    // Y-Axis
    this.svg.append('g').call(d3.axisLeft(yScale));

    //y-axis label
    this.svg
      .append('text')
      .attr('transform', `rotate(-90)`) // Rotate text to be vertical
      .attr('x', -this.height / 2) // Center along the Y-axis
      .attr('y', -this.margin.left + 15) // Move text slightly away from Y-axis
      .attr('text-anchor', 'middle') // Center the text
      .style('font-size', '14px')
      .style('fill', 'black')
      .style('border', '1px solid red') // Debug border
      .text('Rating(*)'); // Y-axis label

    // **STEP 2: Draw the Line Using Averaged Data**
    this.svg
      .append('path')
      .datum(averagedData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-width', 2)
      .attr('d', line);

    // **STEP 3: Draw Scatter Points for Actual Data**
    this.svg
      .selectAll('.mark')
      .data(this.data)
      .enter()
      .append('path')
      .attr('class', 'mark')
      .attr('d', d3.symbol().type(d3.symbolCross).size(35)) // Triangle symbol
      .attr(
        'transform',
        (d) =>
          `translate(${xScale(d.minimumOrderQuantity)}, ${yScale(d.rating)})`
      )
      .attr('fill', 'red')
      .on('mouseenter', (event, d) => this.showDialog(event, d, false))
      .on('mouseleave', () => this.closeDialog());

    // **STEP 4: Draw Points on the Line (For Averages)**
    this.svg
      .selectAll('.avg-dot')
      .data(averagedData)
      .enter()
      .append('circle')
      .attr('class', 'avg-dot')
      .attr('cx', (d) => xScale(d.minimumOrderQuantity))
      .attr('cy', (d) => yScale(d.rating))
      .attr('r', 3.2)
      .attr('fill', 'green')
      .on('mouseenter', (event, d) => {
        //check if there is already mark exists(actual product point)
        const hasProductPoint = this.data.filter(
          (p) => p.minimumOrderQuantity == d.minimumOrderQuantity
        ).length;

        //show the dialgoue if the point is not a actual point
        if (hasProductPoint == 1) {
          this.showDialog(
            event,
            this.data.find(
              (p) => p.minimumOrderQuantity == d.minimumOrderQuantity
            ),
            false
          );
        } else {
          this.showDialog(event, d, true);
        }
      })
      .on('mouseleave', () => this.closeDialog());

    this.chartLoaded = true;
  }
  private createChartDiscountWise(): void {
    //assigning labels
    this.labels = {
      crossLabel: 'Discount Percent per Product',
      dotLabel: 'Average Rating at Discount Percent',
    };

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove(); // Clear existing chart

    this.svg = d3
      .select(element)
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    // **STEP 1: Compute the average rating for each MOQ**
    const groupedData = d3.group(this.data, (d) => d.discountPercentage);
    let averagedData = Array.from(
      groupedData,
      ([discountPercentage, products]) => ({
        discountPercentage,
        rating: d3.mean(products, (d) => d.rating)!, // Calculate average rating
      })
    );
    // averagedData.sort((a, b) => a.rating - b.rating);
    averagedData.sort((a, b) => a.discountPercentage - b.discountPercentage);
    console.log(averagedData, 'avg data');

    // averagedData = averagedData.slice(0, 5);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(this.data, (d) => d.discountPercentage)!])
      .range([0, this.width]);

    const yScale = d3.scaleLinear().domain([0, 5]).range([this.height, 0]);

    const line = d3
      .line<{ discountPercentage: number; rating: number }>()
      .x((d) => xScale(d.discountPercentage))
      .y((d) => yScale(d.rating))
      .curve(d3.curveMonotoneX);

    // X-Axis
    this.svg
      .append('g')
      .attr('transform', `translate(0, ${this.height})`)
      .call(d3.axisBottom(xScale));

    //x-axis label
    this.svg
      .append('text')
      .attr('x', this.width / 2) // Center horizontally
      .attr('y', this.height + this.margin.bottom - 10) // Position below the X-axis
      .attr('text-anchor', 'middle') // Align text
      .style('font-size', '14px') // Adjust font size
      .style('fill', 'black') // Text color
      .text('Discount Percent(%)'); // Your X-axis label

    // Y-Axis
    this.svg.append('g').call(d3.axisLeft(yScale));

    //y-axis label
    this.svg
      .append('text')
      .attr('transform', `rotate(-90)`) // Rotate text to be vertical
      .attr('x', -this.height / 2) // Center along the Y-axis
      .attr('y', -this.margin.left + 15) // Move text slightly away from Y-axis
      .attr('text-anchor', 'middle') // Center the text
      .style('font-size', '14px')
      .style('fill', 'black')
      .style('border', '1px solid red') // Debug border
      .text('Rating(*)'); // Y-axis label

    // **STEP 2: Draw the Line Using Averaged Data**
    this.svg
      .append('path')
      .datum(averagedData)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-width', 2)
      .attr('d', line);

    // **STEP 3: Draw Scatter Points for Actual Data**
    this.svg
      .selectAll('.mark')
      .data(this.data)
      .enter()
      .append('path')
      .attr('class', 'mark')
      .attr('d', d3.symbol().type(d3.symbolCross).size(35)) // Triangle symbol
      .attr(
        'transform',
        (d) => `translate(${xScale(d.discountPercentage)}, ${yScale(d.rating)})`
      )
      .attr('fill', 'red')
      .on('mouseenter', (event, d) => this.showDialog(event, d, false))
      .on('mouseleave', () => this.closeDialog());

    // **STEP 4: Draw Points on the Line (For Averages)**
    this.svg
      .selectAll('.avg-dot')
      .data(averagedData)
      .enter()
      .append('circle')
      .attr('class', 'avg-dot')
      .attr('cx', (d) => xScale(d.discountPercentage))
      .attr('cy', (d) => yScale(d.rating))
      .attr('r', 3.2)
      .attr('fill', 'green')
      .on('mouseenter', (event, d) => {
        //check if there is already mark exists(actual product point)
        const hasProductPoint = this.data.filter(
          (p) => p.minimumOrderQuantity == d.discountPercentage
        ).length;

        //show the dialgoue if the point is not a actual point
        if (hasProductPoint == 1) {
          this.showDialog(
            event,
            this.data.find(
              (p) => p.minimumOrderQuantity == d.discountPercentage
            ),
            false
          );
        } else {
          this.showDialog(event, d, true);
        }
      })
      .on('mouseleave', () => this.closeDialog());

    this.chartLoaded = true;
  }

  selectedProduct: any = null; // To store clicked product
  dialogPosition = { x: 0, y: 0 };
  isAvg: boolean;
  titleConcat: string;
  private showDialog(event: MouseEvent, d: any, isAvg: boolean = false): void {
    event.stopPropagation(); // Prevent closing when clicking inside dialog
    if (isAvg) {
      const products = this.data.filter(
        (p) => p.minimumOrderQuantity === d.minimumOrderQuantity
      );
      const productTitles = products.map((p) => p.title).join(', ');
      this.titleConcat = productTitles;
    }
    this.selectedProduct = { ...d, isAvg };
    this.dialogPosition.x = event.pageX;
    this.dialogPosition.y = event.pageY;
  }
  closeDialog(): void {
    this.selectedProduct = null;
  }
}
