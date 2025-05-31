/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the below code ////////////////////////

/////////////////////////////////////////////////////////////////////////////

(function() {
  function buildQuiz() {
    // we'll need a place to store the HTML output
    const output = [];

    // for each question...
    myQuestions.forEach((currentQuestion, questionNumber) => {
      // we'll want to store the list of answer choices
      const answers = [];

      // and for each available answer...
      for (letter in currentQuestion.answers) {
        // ...add an HTML radio button
        answers.push(
          `<label>
            <input type="radio" name="question${questionNumber}" value="${letter}">
            ${letter} :
            ${currentQuestion.answers[letter]}
          </label>`
        );
      }

      // add this question and its answers to the output
      output.push(
        `<div class="question"> ${currentQuestion.question} </div>
        <div class="answers"> ${answers.join("")} </div>`
      );
    });

    // finally combine our output list into one string of HTML and put it on the page
    quizContainer.innerHTML = output.join("");
  }

  function showResults() {
    // gather answer containers from our quiz
    const answerContainers = quizContainer.querySelectorAll(".answers");

    // keep track of user's answers
    let numCorrect = 0;

    // for each question...
    myQuestions.forEach((currentQuestion, questionNumber) => {
      // find selected answer
      const answerContainer = answerContainers[questionNumber];
      const selector = `input[name=question${questionNumber}]:checked`;
      const userAnswer = (answerContainer.querySelector(selector) || {}).value;

      // if answer is correct
      if (userAnswer === currentQuestion.correctAnswer) {
        // add to the number of correct answers
        numCorrect++;

        // color the answers green
        //answerContainers[questionNumber].style.color = "lightgreen";
      } else {
        // if answer is wrong or blank
        // color the answers red
        answerContainers[questionNumber].style.color = "red";
      }
    });

    // show number of correct answers out of total
    resultsContainer.innerHTML = `${numCorrect} out of ${myQuestions.length}`;
  }

  const quizContainer = document.getElementById("quiz");
  const resultsContainer = document.getElementById("results");
  const submitButton = document.getElementById("submit");
 

/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the above code ////////////////////////

/////////////////////////////////////////////////////////////////////////////






/////////////// Write the MCQ below in the exactly same described format ///////////////


  const myQuestions = [
  {
    question: "What does Le Chatelier’s Principle state?",
    answers: {
      a: "Reactions always move to completion",
      b: "Systems at equilibrium remain unaffected by external changes",
      c: "A system at equilibrium adjusts to oppose any change imposed on it",
      d: "Reactants always dominate at equilibrium"
    },
    correctAnswer: "c"
  },
  {
    question: "If temperature is increased in an exothermic reaction at equilibrium, the system will:",
    answers: {
      a: "Shift to the right (towards products)",
      b: "Shift to the left (towards reactants)",
      c: "Remain unchanged",
      d: "Increase the rate of forward reaction permanently"
    },
    correctAnswer: "b"
  },
  {
    question: "Which of the following changes will shift the equilibrium to the product side?",
    answers: {
      a: "Removing reactants",
      b: "Adding more products",
      c: "Adding more reactants",
      d: "Decreasing pressure in a gaseous system with fewer moles on the product side"
    },
    correctAnswer: "c"
  },
  {
    question: "In a gaseous reaction where the product side has fewer moles of gas, increasing pressure will:",
    answers: {
      a: "Shift equilibrium to the product side",
      b: "Shift equilibrium to the reactant side",
      c: "Have no effect on equilibrium",
      d: "Stop the reaction"
    },
    correctAnswer: "a"
  },
  {
    question: "Which of the following will not affect the position of equilibrium in a closed system?",
    answers: {
      a: "Change in concentration of reactants",
      b: "Change in pressure for gaseous reactions",
      c: "Addition of a catalyst",
      d: "Change in temperature"
    },
    correctAnswer: "c"
  },                             ///// To add more questions, copy the section below 
    									                  ///// this line


    /* To add more MCQ's, copy the below section, starting from open curly braces ( { )
        till closing curly braces comma ( }, )

        and paste it below the curly braces comma ( below correct answer }, ) of above 
        question

    Copy below section

    {
      question: "This is question n?",
      answers: {
        a: "Option 1",
        b: "Option 2",
        c: "Option 3",
        d: "Option 4"
      },
      correctAnswer: "c"
    },

    Copy above section

    */




  ];




/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the below code ////////////////////////

/////////////////////////////////////////////////////////////////////////////


  // display quiz right away
  buildQuiz();

  // on submit, show results
  submitButton.addEventListener("click", showResults);
})();


/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the above code ////////////////////////

/////////////////////////////////////////////////////////////////////////////