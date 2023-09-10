import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_PLACED = process.env.SENDGRID_ORDER_PLACED
const SENDGRID_FROM = process.env.SENDGRID_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  sendgridService: any
}

class OrderPlacedSubscriber {
  protected readonly orderService_: OrderService
  protected sendGridService: any

  constructor({
    eventBusService,
    orderService, 
    sendgridService,
  }: InjectedDependencies) {
    this.orderService_ = orderService
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "order.placed", 
      this.handleOrderPlaced
    )
  }

  handleOrderPlaced = async (data: Record<string, any>) => {
    const order = await this.orderService_.retrieveWithTotals(data.id, {
      relations: ["items", "customer", "shipping_address", "sales_channel"],
    })
    const store = getStoreDetails(order.sales_channel)
    debugLog("handleOrderPlaced running...")
    this.sendgridEmail(order, store)
    this.klaviyoEvent(order, store)
  }

  // SendGrid Email Handler
  sendgridEmail = (order: any, store) => {
    debugLog("sending email to:", order.email)
    debugLog("using template ID:", SENDGRID_ORDER_PLACED)
    debugLog("using store details:", store)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_ORDER_PLACED,
      from: SENDGRID_FROM,
      to: order.email,
      dynamic_template_data: {
        order_id: order.display_id,
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        status: order.status,
        customer: order.customer,
        items: order.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          total: (item.total / 100).toFixed(2),
        })),
        shipping_address: order.shipping_address,
        subtotal: (order.subtotal / 100).toFixed(2),
        shipping_total: (order.shipping_total / 100).toFixed(2),
        tax_total: (order.tax_total / 100).toFixed(2),
        total: (order.total / 100).toFixed(2),
        store: store,
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })    
  }

  // Klaviyo Event Handler
  klaviyoEvent = async (order: any, store) => {
    debugLog("creating event in Klaviyo...")

    try {
      const orderProperties = {
        store: store,
        order: order
        // ... [Add other properties as needed]
      }

      await createEvent("Placed Order", order.email, (order.total / 100).toFixed(2), orderProperties)
      debugLog("'Placed Order' event created successfully in Klaviyo.")
    } catch (error) {
      console.error("Error creating Klaviyo event:", error.message)
    }
  }
}

export default OrderPlacedSubscriber
