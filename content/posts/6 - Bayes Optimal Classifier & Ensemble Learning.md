---
title: "My Third Amazing Post"
date: 2023-09-02T09:03:20-08:00
draft: true
tags: ["AI"]
---

# [Bayes Optimal Classifier & Ensemble Learning](#bayes_optimal_classifier_and_ensemble_learning)

## A formalization

> Given
>   - Instances X
>   - Training examples D: < X<sub>i</sub>, c(X<sub>i</sub>) >
>   - Target concept c
>
> Determine 
>   - A **hypothesis h** in H such that 
>       - h(X) = c(X) for all X in X

<br>

<details>
<summary>Example</summary>
<br>

> Given
>   - Instances X  
>       - Possible days, each described by the attributes Sky, Temp, Humidity, Wind, Water, Forecast
> 
>   <br>
> 
>   - Training examples D: < X<sub>i</sub>, c(X<sub>i</sub>) >
> 
>   <br>
> 
>   - Target concept c  
>       - EnjoySport : X → {0,1}  
>       - c(x)=1 if EnjoySport=yes  
>       - c(x)=0 if EnjoySport=no  
>
> Determine 
>   - A **hypothesis h** in H such that 
>       - h(X) = c(X) for all X in X

</details>

<br>

> The **learning task** is to determine a hypothesis h identical to (which
approximates) the target concept c over *the entire set* of instances X

### Terminology

**If the hypotheses** H are expressed as conjunctions of constraints on the attributes, we say:
- A hypothesis h **covers** a positive example if it correctly classifies the example as positive
- An example <x, c(x)> **satisfies** a hypothesis when h(x) = 1 regardless of wether x is a positive or negative example
- A hypothesis h is **consistent** with an example <x, c(x)> if h(x) = c(x)
- A hypothesis h is **consistent** with a training set D if h is consistent with every example in D


### General-to-specific (subsumption) ordering

> Given two hypotheses h and h'
>   - h is **more general or equal** to h' if and only if any instance that satisfies h also satisfies h'
>  - h is **strictly more general** than h' if and only if h is more general than h' and h' is not more general than h
>
> The inverse relation is **more specific or equal** and **strictly more specific** can be defined analogously.

<br>

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/1.png">
    <figcaption> 
    A set of instances {x1, x2} and a set of hypotesis for it {h1, h2, h3}. h2 is more general than h1 and h3 since it covers more instances. h1 and h3 are equally general. 
    </figcaption>
</figure>

<br>

### Version Space

> The version space, VS<sub>H,D</sub>, 
>   - with respect to hypothesis space H
>   - training examples D  
> 
> is the subset of hypotheses from H consistent with the training examples in D.
> 
> VS<sub>H,D</sub> ≡ {h ∈ H | Consistent(h,D)}

<br>

> **Version space representation theorem**  
> The version space can be represented by its most general and least general members.*

<br>

<figure style="width:50%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/2.png">
    <figcaption> 
    The version space is contained between the most general and least general members. Each training instance reduces the version space.
    </figcaption>
</figure>

<br>

> **General boundary**  
> The **general boundary** G, with respect to hypothesis space H and training data D, is the set of maximally general members of H consistent with D


> **Specific boundary**
> The **specific boundary** S, with respect to hypothesis space H and training data D, is the set of minimally general (i.e., maximally specific) members of H consistent with D

<br>

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/3.png">
    <figcaption> 
    An example version space, defined by its general and specific boundaries.
    </figcaption>
</figure>


<br>

## Bayesian Framework

### Introduction

Given the observed training data D we are interested in determining the best hypothesis from some space H.  
For classification tasks, the hypothesis is a **classifier**.

> What is the best hypothesis?

The best hypothesis is the **most probable** hypothesis, given the data **D** plus any initial knowledge about the prior probabilities of the various hypotheses in **H**.

**Bayes theorem** provides a way to calculate the probability of a hypothesis based on **prior probabilities + observed data**.

<br>

#### Basic formulas of Probability Theory

**Conditional probability** The conditional probability of an event A given an event B is the probability that the event A occurs given that the event B has already occurre. It can be computed as:

<img style="background:white;" width=40% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/4.webp">

<br><br>

**Joint probability** The joint probability of two events A and B is the probability that both A and B occur. It can be computed as:

<img width=75% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/5.jpg">

<br><br>

**Marginal probability** The marginal probability of an event A is the probability that the event A occurs, computed by using the known joint probabilities of A and another event B. It can be computed as:

<img width=40% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/6.png">



<br><br>

**Sum rule** The probability of the disjunction of two events A and B is the sum of the probability of each event minus the probability of the conjunction of the two events. It can be computed as:

<img width=75% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/7.png">


<br><br>

**Theorem of total probability** If events A<sub>1</sub>, ..., A<sub>n</sub> are mutually exclusive and the sum of their probabilities is 1, then the probability of any event B is:

<img width=75% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/8.png">


### Bayes theorem

Some notation:
> - **h** is a hypothesis
> - P(h) is the **prior probability** of h, that is the initial probability that hypothesis h holds, before we have observed training data.  
It reflects some background knowledge we have about the chance that h is a correct hypothesis.
> - P(D) is the **prior probability** of the training data D, that is the probability that training data D will be observed given no knowledge about which hypothesis holds.
> - P(D|h) denotes the probability of observing data D given some world in which hypothesis h holds
> - P(h|D) is the **posterior probability** of h, that is the probability that h holds after we have seen the training data D.

<br>

The **Bayes theorem** states:

<img width=60% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/9.png">

<br>

The **maximally probable hypothesis** h ∈ H is the **Maximum a posteriori (MAP) hypothesis**, that is:

<img width=75% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/10.png">

*The term P(D) can be dropped because it is a constant independent of h*


By assuming that ***all hypotheses are equally probable***, the equation can be further simplified: the hypothesis h that maximizes P(D|h) is the most probable.

P(D|h) is called the **likelihood** of the data D given the hypothesis h.

The hypothesis P(D|h) is called a **maximum likelihood (ML) hypothesis**:

<img width=75% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/11.png">

*Note that a MAP hypothesis incorporates prior knowledge; a ML hypothesis does not.*


### Applying Bayes Theorem to classification problems

> Given 
> - X: the instance space
> - c: X -> {0,1} the classification function to be learned
> - H: the hypothesis space
> - h ∈ H is a boolean function defined over X  
>   - h: X -> {0,1}
>
> <br>
>
> Determine
> - h such that h(x) = c(x) for all x ∈ X

<br>

The information available is a sequence of training examples.

#### Brute-Force MAP Learning Algorithm

> For each hypothesis h ∈ H, compute the posterior probability P(h|D) and output the hypothesis with the highest posterior probability.

This needs the assumptions that:
1) the training data D is noise-free
2) the target concept c is in H
3) we have no no a-priori reason to believe that any hypothesis in H is more likely than any other

###### *How to estimate P(h)?*

Since we assume that all hypotheses are equally probable, and the sum of the probabilities of all hypotheses is 1, for all h ∈ H we have:

<img width=30% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/12.png">

###### *How to estimate P(D|h)?*

From assumption 1, the probability of data D given hypothesis h is 1
if D is consistent with h, and 0 otherwise.

<img width=70% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/13.png">

###### *How to estimate P(D)?*

P(D) can be estimated by the theorem of total probability + mutual exclusion of hypotheses

<img width=80% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/14.png">


Under previous choices of P(h) and P(D|h), every
consistent hypothesis has posterior probability:

<img width=25% src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/15.png">

and every inconsistent hypothesis has posterior
probability 0.

Therefore, **every consistent hypothesis is a MAP hypothesis.**

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/16.png">
    <figcaption> 
        Evolution of P(h|D) with increasing data
    </figcaption>
</figure>

<br>

#### MAP Hypotheses and Consistent Learners

> **Every consistent hypothesis is a MAP hypothesis.**  
> We call **class of consistent learners** the class of learning algorithms that outputs a hypothesis that commits zero errors over training examples.  
> **Every consistent learner outputs a MAP hypothesis, if we assume a uniform prior probability distribution over H and we assume deterministic, noise-free training data.**
>

> The Bayesian framework allows one way to characterize the behaviour of learning algorithms (e.g., FIND-S), even when the learning algorithm does not explicitly manipulate probabilities.

### Bayes Optimal Classifier

So far we have considered the question:
> **What is the most probable hypothesis given the training data?**

In fact, the question that is often of most significance is
the closely related question:

> **What is the most probable classification of the new instance given the training data?**


First solution: simply apply the MAP hypothesis.

Is it possible to do better?

<details>
<summary>Example</summary>

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/17.png">
</figure>
</details>

<br>

In general, the most probable classification of a new instance is obtained by combining the predictions of all hypotheses, weighted by their posterior
probabilities.   
This principle is at the basis of any **Ensemble learning algorithm**.

If the possible classification of the new example can take on any value vj
from some set V, then the probability P(vj ||D) that the correct classification for the new instance is vj is just:

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/18.png">
</figure>

<br>

> A **Bayes Optimal Classification** or **Bayes Optimal Learner** or **Full
Bayesian Learner** is a system that classifies new examples using:

<br>

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/19.png">
</figure>

<br>

**No other classification method using the same hypothesis space and same prior knowledge can outperform this method on average.**


<details>
<summary>Example</summary>

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/20.png">
</figure>

In learning boolean concepts using version spaces, the Bayes optimal classification of a new instance is obtained by taking a weighted vote among all
members of the version space, with each candidate hypothesis weighted by its posterior probability.

</details>


<br>

A curious property of the Bayes Optimal Classifier is that **predictions it makes can correspond to a hypothesis not in H.**

The search space of Bayes Optimal Learner is not H, but H', *which includes hypotheses that perform comparisons between linear combinations of predictions from multiple hypotheses in H.*

Bayes optimal classifier is **quite costly to apply**: It computes the posterior probability for every hypothesis in H and then combines the predictions of each hypothesis to classify each new instance.

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/21.png">
</figure>

<br>

Since P(hMAP|D) does not depend on the new instance, the decision
is actually based on the maximum value of P(vj | hMAP).

<br>

### Gibbs Algorithm

> An alternative approximation is given by a randomly selected hypothesis. This leads to the **Gibbs algorithm**:
> 1. Choose a hypothesis h ∈ H at random, according to the posterior probability distribution over H
2. Use h to predict the classification of the next instance x.

<br>

**Surprising finding**: Assume that hypotheses used for classification
are drawn at random from H according to the prior probability distribution over H. 
Then the expected misclassification error for the Gibbs algorithm is at most twice the expected error of the Bayes optimal classifier.

**Implication**: Suppose the learner assumes a uniform distribution
over H, and that the target concept is in fact drawn from such
distribution, when presented to the learner, then if you pick any hypothesis from VS<sub>H,D</sub> with uniform probability, the expected error is not worse than twice Bayes
optimal.

**Second implication**: Suppose the learner assumes a uniform distribution over H, and that the target concept is in fact drawn from such distribution, when presented to the learner, then if you pick several hypothesis from VS<sub>H,D</sub> with uniform probability, the "ensebled" expected error is not worse than
twice Bayes optimal.

*Example: in Random Forests we "randomly" pick some trees from
the space of possible trees.*


This is an example where a Bayesian analysis of a nonBayesian algorithm yields insight into the performance of that algorithm.  
In general, the performance of Bayes algorithm provides a natural standard against which other algorithms may be compared.

## Ensemble Learning

> *If different models make different mistakes, can we simply average predictions?*

**Ensemble learning** is based on the intuition that different models may be good at different 'parts' of the data, even if they underfit.
Individual mistakes can be *averaged out*.
With respect to the Bayes optimal classifier, the ensemble classifier can now pick hypotheses from a larger space (H') than H.

A **voting classifier** gives every model a *vote* on the class label
- **Hard voting**: the majority wins
- **Soft voting**: the class label with the highest probability is selected


<figure style="width:80%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/22.png">
    <figcaption> 
        A logistic regression classifier and a decision tree classifier are combined into an ensemble classifier that outperforms both individual classifiers.
    </figcaption>        
</figure>


<br>

### Which models should be combined?

The bias-variance analysis tells us that we have two options:

If **the model underfits** (high bias, low variance): *combine with other low-variance models*:  
    - the models needs to be different so to have **different experts** on different parts of the data  
    - **bias reduction** can be done with **boosting**

If **the model overfits** (low bias, high variance): *combine with other low-bias models*:  
    - the models needs to be different so that they **make different mistakes**  
    - **variance reduction** can be done with **bagging**

In general, models must be *uncorrelated* but good enough (otherwise the ensemble is worse).

Another technique can be used to **learn** of to **combine** models: **Stacking**.


### Recaps

#### Decision Trees

> **Decision trees** are classification models that represent the data as a tree structure that splits data points into leaves based on *tests*.  
>
> The **loss** used to build the tree is an **heuristic** that measures the *impurity* of the leaves (e.g. Gini index, entropy).  
>
> Every leaf predicts a class probability. For each class, the probability is the fraction of instances of that class in the leaf.


The *leaf imputrity measures*, used as splitting criteria, are:
<br>

<figure style="width:80%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/24.png">
    <figcaption> 
        Impurity measures for decision trees. L is the set of leaves, l is a specific leaf, X<sub>l</sub> is the dataset fraction for that leaf
    </figcaption>        
</figure>

<br>

<figure style="width:80%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/23.png">
    <figcaption> 
        A decision tree of depth 3 and how it splits the data.
    </figcaption>        
</figure>

<br>

#### Regression Trees

> **Decision trees** are regression models that represent the data as a tree structure that splits data points into leaves based on *tests*.  
> Every leaf predicts the *mean* target value of all points in that leaf.  
> The **loss** used to build the tree minimizes the squared error of the leaves:

<figure style="width:50%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/25.png">
</figure>

<br>

A regression tree yields a **non-smooth step-wise predictor**, so it cannot extrapolate.

<figure style="width:75%">
    <img src="imgs/6 - Bayes Optimal Classifier & Ensemble Learning/26.png">
</figure>

<br> 

*With tree models, we can measure the importance of features (to the model) based on **which features we split on** and **how high up in the tree** we split on them.