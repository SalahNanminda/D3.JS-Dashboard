import { Component, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import {
  BrandStock,
  Particulars,
  ProductStock,
} from 'src/app/Models/BrandStock';
import { ApiService } from 'src/app/Service/api-service';
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css'],
})
export class BarChartComponent {
  @ViewChild('chart', { static: false }) chartContainer!: ElementRef; // ViewChild to get the chart div

  minStock: number = 0;
  maxStock: number;
  selectedCategory: string | undefined = '';

  minStockValue: number = 0; // Minimum limit of range
  maxStockValue: number = 140;

  stock = { min: 10, max: 100 };

  private data: any[] = [];

  Particulars: Particulars[];
  filteredData: Particulars[];

  productStock: ProductStock[];
  categoryStock: BrandStock[];

  constructor(private apiService: ApiService, private el: ElementRef) {
    this.Particulars = [
      { Id: 1, name: 'products' },
      { Id: 2, name: 'category' },
    ];
  }

  ngOnInit() {
    this.selectedCategory = this.Particulars.find((x) => (x.Id = 1))?.name;
    this.stockRangeUpdate();
    this.apiService.getData().subscribe((response: any) => {
      this.data = response.products;

      this.productStock = this.data.map((price: any) => ({
        product: price.title,
        totalStock: price.stock,
      }));

      this.createChart(this.productStock);

      this.categoryStock = Object.values<BrandStock>(
        this.data.reduce((acc: { [key: string]: BrandStock }, product: any) => {
          if (!acc[product.category]) {
            acc[product.category] = {
              category: product.category,
              totalStock: 0,
            };
          }
          acc[product.category].totalStock += product.stock;
          return acc;
        }, {})
      ).sort((a, b) => a.category.localeCompare(b.category));
    });
  }

  private createChart(productStock: ProductStock[]) {
    productStock = productStock.sort((a, b) => b.totalStock - a.totalStock);

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove(); // Clear previous chart

    const margin = { top: 30, right: 30, bottom: 150, left: 80 };

    const width = 600 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;
    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g') // Create a group to move the chart
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define Tooltip
    const tooltip = d3.select('#tooltip');

    //scale x
    const x = d3
      .scaleBand()
      .domain(productStock.map((d) => d.product))
      .range([0, width])
      .padding(0.2);

    //scale y
    const y = d3.scaleLinear().domain([0, 140]).range([height, 0]);

    //add X-axis
    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-0.8em')
      .attr('dy', '0.5em')
      .attr('fill', 'black') // Change text color
      .attr('transform', 'rotate(-45)');

    //add label under the x-axis
    svg
      .append('text')
      .attr('x', width / 2) // Center horizontally
      .attr('y', height + margin.bottom - 15) // Position below the X-axis
      .attr('text-anchor', 'middle') // Align text
      .style('font-size', '14px') // Adjust font size
      .style('fill', 'black') // Text color
      .text('Brands'); // Your X-axis label

    //add Y-axis
    svg
      .append('g')
      // .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y));

    svg
      .append('text')
      .attr('transform', `rotate(-90)`) // Rotate text to be vertical
      .attr('x', -height / 2) // Center along the Y-axis
      .attr('y', -margin.left + 50) // Move text slightly away from Y-axis
      .attr('text-anchor', 'middle') // Center the text
      .style('font-size', '14px')
      .style('fill', 'black')
      .style('border', '1px solid red') // Debug border
      .text('Stock'); // Y-axis label

    //add bars
    svg
      .selectAll('.bar')
      .data(productStock)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.product)!)
      .attr('y', (d) => y(d.totalStock))
      .attr('width', x.bandwidth())
      .attr('height', (d) => y(0) - y(d.totalStock))
      .attr('fill', 'steelblue')

      .on('mouseover', (event, d) => {
        tooltip
          .style('display', 'block')
          .html(`Units: ${d.totalStock}`)
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY - 25}px`);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY - 25}px`);
      })
      .on('mouseout', () => {
        tooltip.style('display', 'none');
      });
    svg
      .selectAll('yGridLines')
      .data(y.ticks(5)) // Adjust number of grid lines
      .enter()
      .append('line')
      .attr('x1', 0) // Start from Y-axis
      .attr('x2', width) // Extend to right
      .attr('y1', (d) => y(d)) // Position based on ticks
      .attr('y2', (d) => y(d))
      .attr('stroke', 'gray') // Line color
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4');
  }
  private createChartCategorywise(brandstock: BrandStock[]) {
    brandstock = brandstock.sort((a, b) => b.totalStock - a.totalStock);

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove(); // Clear previous chart

    const margin = { top: 30, right: 30, bottom: 100, left: 80 };

    const width = 600 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;
    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g') // Create a group to move the chart
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define Tooltip
    const tooltip = d3.select('#tooltip');

    //scale x
    const x = d3
      .scaleBand()
      .domain(brandstock.map((d) => d.category))
      .range([0, width])
      .padding(0.2);

    //scale y
    const y = d3.scaleLinear().domain([0, 700]).range([height, 0]);

    //add X-axis
    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-0.8em')
      .attr('dy', '0.5em')
      .attr('fill', 'black') // Change text color
      .attr('transform', 'rotate(-45)');

    //add label under the x-axis
    svg
      .append('text')
      .attr('x', width / 2) // Center horizontally
      .attr('y', height + margin.bottom - 10) // Position below the X-axis
      .attr('text-anchor', 'middle') // Align text
      .style('font-size', '14px') // Adjust font size
      .style('fill', 'black') // Text color
      .text('Categories'); // Your X-axis label

    //add Y-axis
    svg
      .append('g')
      // .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y));

    svg
      .append('text')
      .attr('transform', `rotate(-90)`) // Rotate text to be vertical
      .attr('x', -height / 2) // Center along the Y-axis
      .attr('y', -margin.left + 50) // Move text slightly away from Y-axis
      .attr('text-anchor', 'middle') // Center the text
      .style('font-size', '14px')
      .style('fill', 'black')
      .style('border', '1px solid red') // Debug border
      .text('Stock'); // Y-axis label

    //add bars
    svg
      .selectAll('.bar')
      .data(brandstock)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.category)!)
      .attr('y', (d) => y(d.totalStock))
      .attr('width', x.bandwidth())
      .attr('height', (d) => y(0) - y(d.totalStock))
      .attr('fill', 'steelblue')

      .on('mouseover', (event, d) => {
        tooltip
          .style('display', 'block')
          .html(`Units: ${d.totalStock}`)
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY - 25}px`);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY - 25}px`);
      })
      .on('mouseout', () => {
        tooltip.style('display', 'none');
      });
    svg
      .selectAll('yGridLines')
      .data(y.ticks(5)) // Adjust number of grid lines
      .enter()
      .append('line')
      .attr('x1', 0) // Start from Y-axis
      .attr('x2', width) // Extend to right
      .attr('y1', (d) => y(d)) // Position based on ticks
      .attr('y2', (d) => y(d))
      .attr('stroke', 'gray') // Line color
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4');
  }
  ngAfterViewInit() {
    this.updateChart(); // Call the function when the view is initialized
  }
  applyFilters() {
    if (this.selectedCategory === 'products') {
      // Logic to filter by products
      const filteredProducts = this.productStock.filter(
        (d) => d.totalStock >= this.minStock && d.totalStock <= this.maxStock
      );
      this.createChart(filteredProducts);
    } else if (this.selectedCategory === 'category') {
      // Logic to filter by category
      let brandStock = this.categoryStock.filter(
        (d) => d.totalStock >= this.minStock && d.totalStock <= this.maxStock
      );

      // **3. Draw new chart after clearing old one**
      this.createChartCategorywise(brandStock);
    }
  }

  applyFilter(event: Event) {
    const selectedFilter = (event.target as HTMLSelectElement).value;

    this.selectedCategory = selectedFilter;
    this.stockRangeUpdate();
  }

  stockRangeUpdate() {
    if (this.selectedCategory == 'products') {
      this.minStock = 0;
      this.maxStock = 140;

      this.minStockValue = 0;
      this.maxStockValue = 140;
    } else {
      this.minStock = 0;
      this.maxStock = 700;

      this.minStockValue = 0;
      this.maxStockValue = 700;
    }
  }

  chartInstance: any;
  updateChart() {
    const chartDiv = this.chartContainer.nativeElement;

    const chartContainer = d3.select('#chart');

    // ✅ Remove the existing SVG if it exists
    chartContainer.select('svg').remove();

    if (!chartContainer.select('svg').empty()) {
      chartContainer.select('svg').remove();
    }

    chartContainer.select('svg').remove();

    // **1. Destroy previous chart instance (if exists)**
    if (this.chartInstance) {
      this.chartInstance.remove(); // Remove previous SVG element
      this.chartInstance = null; // Reset instance
    }

    // **2. Completely remove all child elements**
    chartContainer.selectAll('*').remove();
  }

  stockRangeChange(val: number) {
    if (val == 1 && this.minStock > this.maxStock) {
      this.maxStock = this.minStock;
    }

    if (val == 2 && this.maxStock < this.minStock) {
      this.minStock = this.maxStock;
    }
  }
}
