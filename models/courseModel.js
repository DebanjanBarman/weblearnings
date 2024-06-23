const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
    },
    summary: {
      type: String,
      required: [true, "Summary is required"],
    },
    author: {
      type: String,
      required: [true, "Course must have one author"],
    },
    courseImage: {
      alt: {
        type: String,
        required: [true, "give an alternative name"],
      },
      url: {
        type: String,
        required: [true, "url in required"],
      },
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    category: {
      type: String,
      required: "Category is required",
    },
    language: {
      type: String,
      required: [true, "Language is required"],
    },
    description: {
      type: String,
    },
    topics: {
      type: [String],
      required: [true, "Course must have some topics"],
    },
    price: {
      type: Number,
      default: 0,
    },
    lessonNo: {
      type: Number,
      // required: [true, "Please enter how many videos are there"],
      default: 0,
    },
    introVideo: {
      type: String,
    },
    modules: [
      {
        title: String,
        duration: String,
        playerUrl: String,
        clips: [
          {
            title: String,
            duration: String,
            playerUrl: String,
          },
        ],
      },
    ],
    realiseDate: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    published: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
// courseSchema.virtual('introVideo').get(function () {
// 	if (this.content) {
// 		return this.content[0].url
// 	}
// })
courseSchema.pre("find", function (next) {
  // this.find({ published: { $ne: false } });
  next();
});
courseSchema.pre("save", function (next) {
  if (this.modules.length > 0) {
    this.introVideo = this.modules[0].clips[0].playerUrl;
  } else {
    this.published = false;
  }
  next();
});

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
