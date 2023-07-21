import { EventBusService } from "@medusajs/medusa"

const SENDGRID_USER_INVITE = process.env.SENDGRID_USER_INVITE
const SENDGRID_FROM = process.env.SENDGRID_FROM
const ADMIN_URL = process.env.ADMIN_URL

type InjectedDependencies = {
  eventBusService: EventBusService
  sendgridService: any
}

class InviteSubscriber {
  protected sendGridService: any

  constructor({ 
    eventBusService,
    sendgridService, 
  }: InjectedDependencies) {
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "invite.created", 
      this.handleInvite
    )
  }

  handleInvite = async (data: Record<string, any>) => {
    this.sendGridService.sendEmail({
      templateId: SENDGRID_USER_INVITE,
      from: SENDGRID_FROM,
      to: data.user_email,
      dynamic_template_data: {
        token: data.token,
        user_email: data.user_email,
        admin_url: ADMIN_URL
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })
  }
}

export default InviteSubscriber