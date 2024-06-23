const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Course = require("./../models/courseModel");
const Purchase = require("./../models/purchaseModel");
const User = require("../models/userModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //1 Get currently purchased course
  const course = await Course.findById(req.params.courseID);

  //2 Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: req.user.email,
    client_reference_id: req.params.courseID,
    success_url: process.env.PAYMENT_SUCCESS_URL,
    cancel_url: process.env.PAYMENT_SUCCESS_URL,
    line_items: [
      {
        name: `${course.title}`,
        description: `${course.summary}`,
        images: [`${course.courseImage.url}`],
        amount: course.price * 100,
        currency: "inr",
        // price: process.env.PRICE_ID,
        quantity: 1,
      },
    ],
  });
  if (!session) {
    return next(new AppError("something went wrong", 500));
  }

  //3 send it to client
  res.status(200).json({
    status: "success",
    session,
  });
});

const purchased = async (session) => {
  const course = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total / 100;
  await Purchase.create({ course, user, price });
};

exports.webhookController = async (req, res, next) => {
  const signature = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (e) {
    return res.status(400).json(`Webhook error: ${e.message}`);
  }

  if (event.type === "checkout.session.completed") {
    purchased(event.data.object);
  }
  res.sendStatus(200);
};

exports.getFreeCourse = catchAsync(async (req, res, next) => {
  // 1 Get the course details
  const course = await Course.findById(req.params.courseID);
  if (!course || course.published !== true) {
    return next(new AppError("No course found with that id", 404));
  }
  const courseID = course.id;

  //  2 Check if the course is free and published if free create new Purchase document
  if (course.price === 0) {
    const newCourse = courseID;
    const user = req.user.id;
    const price = 0;

    try {
      await Purchase.create({ course: newCourse, user, price });
      res.status(200).json({
        message: "success",
      });
    } catch (e) {
      return next(new AppError("something went wrong", 500));
    }
  } else {
    res.status(403).json({
      message: "Course is Not free",
    });
  }
});

//
// // Retrieve the event by verifying the signature using the raw body and secret.
// let event;
//
// try {
// 	event = stripe.webhooks.constructEvent(
// 		req.body,
// 		req.headers['stripe-signature'],
// 		process.env.STRIPE_WEBHOOK_SECRET
// 	);
// } catch (err) {
// 	console.log(err);
// 	console.log(`⚠️  Webhook signature verification failed.`);
// 	console.log(
// 		`⚠️  Check the env file and enter the correct webhook secret.`
// 	);
// 	return res.sendStatus(400);
// }
// // Extract the object from the event.
// const dataObject = event.data.object;
//
// // Handle the event
// // Review important events for Billing webhooks
// // https://stripe.com/docs/billing/webhooks
// // Remove comment to see the various objects sent for this sample
// switch (event.type) {
// 	case 'invoice.paid':
// 		// Used to provision services after the trial has ended.
// 		// The status of the invoice will show up as paid. Store the status in your
// 		// database to reference when a user accesses your service to avoid hitting rate limits.
// 		break;
// 	case 'invoice.payment_failed':
// 		// If the payment fails or the customer does not have a valid payment method,
// 		//  an invoice.payment_failed event is sent, the subscription becomes past_due.
// 		// Use this webhook to notify your user that their payment has
// 		// failed and to retrieve new card details.
// 		break;
// 	case 'invoice.finalized':
// 		// If you want to manually send out invoices to your customers
// 		// or store them locally to reference to avoid hitting Stripe rate limits.
// 		break;
// 	case 'customer.subscription.deleted':
// 		if (event.request != null) {
// 			// handle a subscription cancelled by your request
// 			// from above.
// 		} else {
// 			// handle subscription cancelled automatically based
// 			// upon your subscription settings.
// 		}
// 		break;
// 	case 'customer.subscription.trial_will_end':
// 		if (event.request != null) {
// 			// handle a subscription cancelled by your request
// 			// from above.
// 		} else {
// 			// handle subscription cancelled automatically based
// 			// upon your subscription settings.
// 		}
// 		break;
// 	default:
// 	// Unexpected event type
// }
// res.sendStatus(200);
// }

//
// if (event.type === 'customer.subscription.updated') {
// 	updateSubscription(event.data.object)
// }
//
// const updateSubscription = async session => {
// 	const customer = session.customer
// 	const subscription = !session.cancel_at_period_end
// 	const expiresAt = session.current_period_end * 1000;
//
// 	const user = await User.findOne({stripe_user_id: customer})
// 	const id = user.id
// 	await User.findByIdAndUpdate(id, {subscription, subscription_expire_at: expiresAt})
// }
// exports.customerPortal = catchAsync(async (req, res, next) => {
// 	const customer = req.user.stripe_user_id
// 	const session = await stripe.billingPortal.sessions.create({
// 		customer: customer,
// 		return_url: 'https://debanjan.me',
// 	});
// 	if (!session) {
// 		return next(new AppError('something went wrong', 500))
// 	}
// 	res.status(200).json({
// 		status: 'success',
// 		session
// 	})
// })
