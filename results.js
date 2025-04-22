// results.js (Updated calculateResults function)

function getRecommendations5to8(percentage) {
    // ... (keep existing recommendations function as is)
    if (percentage > 80) {
        return [
            "Your exceptional aptitude shows a strong foundation in core subjects like math, language, and reasoning.",
            "Participate in national-level competitions like the Math Olympiad or Science Olympiad to challenge yourself.",
            "Join advanced classes or workshops in subjects you excel in, such as coding or creative writing.",
            "Engage in group projects like building a science model or organizing a school play to enhance teamwork.",
            "Explore online platforms like Khan Academy for advanced lessons in math and science.",
            "Develop leadership skills by taking up roles like class monitor or team captain in school activities.",
            "Read books on problem-solving, such as 'The Art of Problem Solving' series, to sharpen your skills.",
            "Join a robotics club to combine creativity and logical thinking in a practical way.",
            "Practice public speaking by participating in debates or elocution competitions.",
            "Set a goal to learn a new skill, such as playing a musical instrument or a new sport.",
            "Work on time management by creating a daily schedule for studies, hobbies, and rest.",
            "Explore STEM kits to conduct experiments at home, like building a simple circuit or a solar model.",
            "Volunteer to mentor younger students in your school to reinforce your knowledge.",
            "Take up creative hobbies like painting, pottery, or writing short stories to balance academics.",
            "Join a library and read books on diverse topics, such as history, space, or technology.",
            "Participate in quizzes or trivia contests to improve your general knowledge.",
            "Learn basic coding through platforms like Code.org to prepare for future tech skills.",
            "Discuss your interests with teachers to explore advanced topics in your favorite subjects.",
            "Stay curious—ask questions about the world around you, from nature to gadgets.",
            "Keep up your excellent work and aim for consistent growth in all areas!"
        ];
    } else if (percentage > 60) {
        return [
            "You have a good aptitude in core subjects, with potential to become an excellent performer.",
            "Practice daily with math problems, such as solving 10 addition or subtraction questions.",
            "Join a study group to collaborate with peers and learn from each other’s strengths.",
            "Engage in creative activities like drawing, storytelling, or making crafts to boost imagination.",
            "Read short storybooks or science magazines like 'Tell Me Why' to make learning fun.",
            "Spend 15-20 minutes daily on brain teasers or puzzles to improve focus and problem-solving.",
            "Ask your teacher for extra worksheets in subjects you find challenging, like math or grammar.",
            "Participate in school events like sports day or annual day to build confidence.",
            "Try simple DIY projects at home, such as making a paper airplane or a birdhouse.",
            "Discuss your school day with your parents to identify areas where you need support.",
            "Create a study timetable to balance schoolwork, playtime, and rest effectively.",
            "Watch educational videos on platforms like YouTube to understand tough concepts visually.",
            "Set small, achievable goals, like improving your math score by 5% in the next test.",
            "Join a local library to access books on topics you’re curious about, like animals or space.",
            "Practice writing short essays or stories to improve your language skills.",
            "Explore apps like Duolingo to learn a new language in a fun way.",
            "Participate in group activities like a school play or science fair to improve teamwork.",
            "Celebrate your progress, no matter how small, to stay motivated.",
            "Stay positive—consistent effort will lead to steady improvement over time.",
            "Keep exploring new activities to discover what excites you the most!"
        ];
    } else {
        return [
            "You’re building a basic aptitude—great job starting your learning journey!",
            "Focus on practicing simple math, like counting or basic addition, for 10 minutes daily.",
            "Ask a friend, teacher, or parent to explain difficult topics in a simple, fun way.",
            "Try relaxing activities like coloring or drawing to spark your creativity.",
            "Read easy storybooks or comics, such as Amar Chitra Katha, to enjoy learning.",
            "Spend a few minutes each day solving simple puzzles, like matching shapes or numbers.",
            "Join group activities at school, like a drawing club, to feel more comfortable with peers.",
            "Watch fun learning videos, such as animated math lessons or science cartoons.",
            "Start with small projects, like planting a seed in a pot or making a paper craft.",
            "Share what you learned in school with your family to build confidence in speaking.",
            "Practice writing numbers or short sentences daily to improve slowly and steadily.",
            "Celebrate small achievements, like solving one more math problem correctly.",
            "Don’t hesitate to ask questions in class—every question helps you learn more!",
            "Find a topic you like, such as cars or animals, and read simple books about it.",
            "Play educational games like counting games or word puzzles to make learning fun.",
            "Join a buddy system at school to learn alongside a friend who can help you.",
            "Take your time to understand concepts—slow and steady progress is the best way.",
            "Explore nature by observing plants or insects in your garden to spark curiosity.",
            "Keep a small notebook to draw or write about things you enjoy learning.",
            "Keep trying—you’re on the right path to getting better every day!"
        ];
    }
}

function getRecommendations9to10(scores, suggestedStream) {
    // ... (keep existing recommendations function as is)
    if (typeof scores !== 'object' || scores === null) {
      console.error("Invalid scores object passed to getRecommendations9to10:", scores);
      return [
          "Recommendations could not be generated due to a data issue.",
          "Please check the input scores.",
          `Suggested Stream based on input: ${suggestedStream}`
          ];
    }
    const numericScores = Object.values(scores).filter(value => typeof value === 'number');
    const maxScore = numericScores.length > 0 ? Math.max(...numericScores) : 0;
    return [
        `Based on your interests, ${suggestedStream} could be a great stream for your future studies.`,
        (scores.realistic ?? 0) > 30 ? "Join practical workshops like robotics, carpentry, or electronics to explore hands-on skills." : "Start with basic hands-on projects like building a model car or a simple circuit.",
        (scores.investigative ?? 0) > 30 ? "Participate in math or science clubs to deepen your analytical skills and prepare for competitive exams." : "Practice problem-solving with puzzles, science kits, or online math challenges.",
        (scores.artistic ?? 0) > 30 ? "Engage in creative arts like painting, music, or drama to nurture your talents and express yourself." : "Try creative hobbies like sketching, writing short stories, or making rangoli designs.",
        (scores.social ?? 0) > 30 ? "Volunteer in community events or school programs to enhance your interpersonal skills." : "Help classmates with their studies or join a peer support group to build social confidence.",
        (scores.enterprising ?? 0) > 30 ? "Start a small project like organizing a school event or a charity drive to develop leadership skills." : "Practice leadership by taking initiative in group activities or class projects.",
        (scores.conventional ?? 0) > 30 ? "Work on organizing tasks, such as managing a study schedule or a small budget, to improve planning skills." : "Practice keeping your study materials, books, and notes organized for better efficiency.",
        "Explore career options by attending career fairs or talking to professionals in your suggested stream.",
        "Join online forums or groups related to your stream to connect with like-minded peers.",
        "Read books or watch documentaries related to your stream, such as biographies of scientists for Science stream.",
        "Participate in school competitions like debates, quizzes, or art exhibitions to build confidence.",
        "Take up a hobby that aligns with your stream, like photography for Arts or coding for Science.",
        "Discuss your results with your parents and teachers to plan your next steps effectively.",
        "Set short-term goals, like improving your scores in specific subjects by the next exam.",
        "Explore online courses on platforms like Coursera or Udemy to gain a head start in your stream.",
        "Join a study group to prepare for board exams and share knowledge with peers.",
        "Practice time management by balancing studies, hobbies, and relaxation effectively.",
        "Attend workshops or seminars on career guidance to understand your stream’s future prospects.",
        "Keep a journal to track your progress and reflect on your strengths and areas to improve.",
        "Stay motivated by celebrating small achievements as you prepare for your academic journey."
    ];
}


function calculateResults(selectedStandard, selectedLanguage, userAnswers) {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    let score, summary, detailedResult;
    let personalityProfile = {}; // Initialize personality profile object

    try {
        if (selectedStandard <= 8) {
            const questions_5_8 = window.questions5to8?.[selectedLanguage];
            if (!questions_5_8) {
                console.error('Questions for Grades 5-8 not found for language:', selectedLanguage);
                throw new Error('Questions for Grades 5-8 not found.');
            }
            const totalAptitude = questions_5_8.filter(q => !q.type && q.correct).length || 0;
            const totalActualQuestions = questions_5_8.length || 0;

            score = 0;
            let personalityScores = { // Temporary object to hold raw scores
                sociability: 0,
                openness: 0,
                agreeableness: 0,
                persistence: 0,
                anxiety: 0,
                artistic: 0,
                investigative: 0
            };

            questions_5_8.forEach((q, i) => {
                const answer = userAnswers[i];
                if (!answer) return; // Skip if no answer

                // --- Aptitude Scoring ---
                if (!q.type && q.correct && answer === q.correct) {
                    score++;
                }
                // --- Personality Scoring (for questions 26-40, index 25-39) ---
                else if (q.type === "personality") {
                    const points = (answer === "Yes" || answer === "होय") ? 1 :
                                   (answer === "No" || answer === "नाही") ? -1 : 0; // Maybe = 0 points

                    // Map question index (i) to traits
                    if (i === 25) personalityScores.sociability += points; // Q26
                    if (i === 26) personalityScores.persistence += points; // Q27
                    // Q28 (reading) - could be introversion/curiosity, let's skip for simplicity now
                    if (i === 28) personalityScores.sociability += points; // Q29
                    if (i === 29) personalityScores.sociability -= points; // Q30 (prefer alone, invert score)
                    if (i === 30) personalityScores.agreeableness += points; // Q31
                    if (i === 31) personalityScores.openness += points; // Q32
                    // Q33 (memory) - skip for now
                    if (i === 33) personalityScores.openness += points; // Q34
                    if (i === 34) personalityScores.anxiety += points; // Q35
                    if (i === 35) personalityScores.artistic += points; // Q36
                    if (i === 36) personalityScores.openness += points; // Q37 (also investigative)
                    if (i === 37) personalityScores.sociability += points; // Q38
                    if (i === 38) personalityScores.investigative += points; // Q39
                    if (i === 39) personalityScores.openness += points; // Q40 (also investigative)
                }
            });

            // --- Process Personality Scores into Profile ---
            // (This is a very basic interpretation, adjust levels as needed)
            personalityProfile.sociability = personalityScores.sociability > 1 ? "High" : personalityScores.sociability < -1 ? "Low" : "Moderate";
            personalityProfile.openness = personalityScores.openness > 1 ? "High" : personalityScores.openness < 0 ? "Low" : "Moderate";
            personalityProfile.agreeableness = personalityScores.agreeableness > 0 ? "High" : personalityScores.agreeableness < 0 ? "Low" : "Moderate";
            personalityProfile.persistence = personalityScores.persistence > 0 ? "High" : personalityScores.persistence < 0 ? "Low" : "Moderate";
            personalityProfile.anxiety = personalityScores.anxiety > 0 ? "Noted" : "Not Indicated"; // Simple flag
            personalityProfile.artistic = personalityScores.artistic > 0 ? "Indicated" : "Not Indicated";
            personalityProfile.investigative = personalityScores.investigative > 0 ? "Indicated" : "Not Indicated";


            // --- Combine Results ---
            const percentage = totalAptitude > 0 ? (score / totalAptitude) * 100 : 0;
            summary = `Score: ${score}/${totalAptitude} Aptitude Questions (${totalActualQuestions} total items)`;

            detailedResult = {
                 scores: { score, scoredQuestions: totalAptitude, totalItems: totalActualQuestions, percentage: parseFloat(percentage.toFixed(2)) },
                 analysis: `Performance indicates ${percentage > 80 ? "exceptional" : percentage > 60 ? "good" : "basic"} aptitude.`,
                 recommendations: getRecommendations5to8(percentage),
                 personalityProfile: personalityProfile // Add the profile here
             };

             // Add Marathi translation if needed - personalityProfile terms need translation
             if (selectedLanguage === 'marathi') {
                 detailedResult.analysis = `तुमची कामगिरी ${percentage > 80 ? "असाधारण" : percentage > 60 ? "चांगली" : "मूलभूत"} क्षमता दर्शवते.`;
                 // Basic Marathi translation for profile (needs verification/improvement)
                 const marathiProfile = {
                    sociability: { High: "उच्च सामाजिकता", Moderate: "मध्यम सामाजिकता", Low: "कमी सामाजिकता" }[personalityProfile.sociability] || "मध्यम सामाजिकता",
                    openness: { High: "उच्च मोकळेपणा/जिज्ञासा", Moderate: "मध्यम मोकळेपणा/जिज्ञासा", Low: "कमी मोकळेपणा/जिज्ञासा" }[personalityProfile.openness] || "मध्यम मोकळेपणा/जिज्ञासा",
                    agreeableness: { High: "उच्च सहमतता", Moderate: "मध्यम सहमतता", Low: "कमी सहमतता" }[personalityProfile.agreeableness] || "मध्यम सहमतता",
                    persistence: { High: "उच्च चिकाटी", Moderate: "मध्यम चिकाटी", Low: "कमी चिकाटी" }[personalityProfile.persistence] || "मध्यम चिकाटी",
                    anxiety: { Noted: "चिंता दर्शविली", "Not Indicated": "चिंता दर्शविली नाही" }[personalityProfile.anxiety] || "चिंता दर्शविली नाही",
                    artistic: { Indicated: "कलात्मक आवड दर्शविली", "Not Indicated": "कलात्मक आवड दर्शविली नाही" }[personalityProfile.artistic] || "कलात्मक आवड दर्शविली नाही",
                    investigative: { Indicated: "शोधक आवड दर्शविली", "Not Indicated": "शोधक आवड दर्शविली नाही" }[personalityProfile.investigative] || "शोधक आवड दर्शविली नाही"
                 };
                 detailedResult.personalityProfile = marathiProfile; // Overwrite with Marathi version
             }


        } else { // Grades 9-10 (Keep existing RIASEC logic)
            const questions_9_10 = window.questions9to10?.[selectedLanguage];
            if (!questions_9_10) {
                 console.error('Questions for Grades 9-10 not found for language:', selectedLanguage);
                throw new Error('Questions for Grades 9-10 not found.');
            }
            const totalActualQuestions_9_10 = questions_9_10.length || 0;

            let realistic = 0, investigative = 0, artistic = 0, social = 0, enterprising = 0, conventional = 0;
            const ranges = { // Assuming 42 questions total, 7 per category
                realistic: [0, 6], investigative: [7, 13], artistic: [14, 20],
                social: [21, 27], enterprising: [28, 34], conventional: [35, 41]
            };
             if (totalActualQuestions_9_10 !== 42) {
                console.warn(`Expected 42 questions for RIASEC scoring based on ranges, but found ${totalActualQuestions_9_10}. Scoring might be inaccurate.`);
             }

            questions_9_10.forEach((q, i) => {
                const answer = userAnswers[i];
                if (!answer) return;
                const points = (answer === "Like" || answer === "आवडते") ? 5 :
                               (answer === "Neutral" || answer === "ठीक आहे") ? 3 :
                               (answer === "Dislike" || answer === "आवडत नाही") ? 1 : 0;

                if (i >= ranges.realistic[0] && i <= ranges.realistic[1]) realistic += points;
                else if (i >= ranges.investigative[0] && i <= ranges.investigative[1]) investigative += points;
                else if (i >= ranges.artistic[0] && i <= ranges.artistic[1]) artistic += points;
                else if (i >= ranges.social[0] && i <= ranges.social[1]) social += points;
                else if (i >= ranges.enterprising[0] && i <= ranges.enterprising[1]) enterprising += points;
                else if (i >= ranges.conventional[0] && i <= ranges.conventional[1]) conventional += points;
            });

             const scores = { realistic, investigative, artistic, social, enterprising, conventional };
             const maxScoreValue = Math.max(...Object.values(scores));
             const topCategories = Object.keys(scores).filter(key => scores[key] === maxScoreValue);

             let suggestedStream = 'Undetermined';
             if (topCategories.includes('realistic') || topCategories.includes('investigative')) {
                 suggestedStream = selectedLanguage === 'english' ? 'Science' : 'विज्ञान';
             } else if (topCategories.includes('enterprising') || topCategories.includes('conventional')) {
                 suggestedStream = selectedLanguage === 'english' ? 'Commerce' : 'वाणिज्य';
             } else if (topCategories.includes('artistic') || topCategories.includes('social')) {
                 suggestedStream = selectedLanguage === 'english' ? 'Arts' : 'कला';
             } else if (topCategories.length > 0) {
                  suggestedStream = selectedLanguage === 'english' ? `Consider ${topCategories[0].charAt(0).toUpperCase() + topCategories[0].slice(1)} related fields` : `संबंधित ${topCategories[0]} क्षेत्रांचा विचार करा`;
             }

            summary = `RIASEC Analysis (${totalActualQuestions_9_10} items). Suggested Stream: ${suggestedStream}`;
            const scoresWithTotal = { ...scores, totalItems: totalActualQuestions_9_10 };

            if (selectedLanguage === 'english') {
                detailedResult = {
                    scores: scoresWithTotal,
                    analysis: `Top Interest Areas: ${topCategories.join(', ')}. Suggested Stream: ${suggestedStream}`,
                    recommendations: getRecommendations9to10(scores, suggestedStream)
                };
            } else { // Marathi
                detailedResult = {
                    scores: scoresWithTotal,
                    analysis: `प्रमुख आवड क्षेत्रे: ${topCategories.join(', ')}. सुचवलेली शाखा: ${suggestedStream}`,
                    recommendations: getRecommendations9to10(scores, suggestedStream)
                };
            }
        }
    } catch (error) {
         console.error("Error within calculateResults:", error);
         throw error;
    }

    if (!detailedResult) {
        console.error("Failed to generate detailedResult object.");
        detailedResult = {
            scores: {},
            analysis: "Error: Could not calculate results.",
            recommendations: ["Please try again or contact support."],
            // Add empty personality profile for grades 5-8 in case of error
            ...(selectedStandard <= 8 && { personalityProfile: {} })
        };
         summary = "Error during calculation";
    }

    return { date: dateStr, summary, detailedResult };
}

// IMPORTANT: Make sure this line is present and correct at the end of the file
window.calculateResults = calculateResults;
